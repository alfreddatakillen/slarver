const stream = require('stream');

function nextPositionInSplit(splits, splitsToJoin, splitIndex, startPos) {
	let pos = startPos;
	while ((splitIndex + pos) % splits >= splits - splitsToJoin + 1) {
		pos++;
	}
	return pos;
}

class Join extends stream.Readable {

	constructor() {
		super();
		this.paused = true;
		this.byteCounter = 0;
		this.sourceCounter = 0;
		this.bufferPosition = [];
		this.buffers = [];
		this.sourceSplits = [];
		this.sourcesEnded = 0;
	}

	_read() {
		this.joinSources();
	}

	joinSources() {

		const outputBufferSize = 8192;
		const outputBuffer = new Buffer(outputBufferSize);
		let outputBufferPos = 0;

		this.paused = false;
		if (this.sourceCounter === 0) return;

		let lastByteCounter;
		while (lastByteCounter !== this.byteCounter) {

			lastByteCounter = this.byteCounter;

			if (this.sourcesEnded === this.sourceCounter) {
				const totalBuffered = this.buffers.reduce((acc, buffer) => {
					return acc + buffer.length;
				}, 0);
				if (totalBuffered === 0) {
					this.push(null);
					return;
				}
			}

			this.buffers.forEach((buffer, sourceIndex) => {

				const sourceSplit = this.sourceSplits[sourceIndex];
				const splits = sourceSplit.splits;
				const splitsToJoin = sourceSplit.splitsToJoin;
				const splitIndex = sourceSplit.splitIndex;

				while (this.bufferPosition[sourceIndex] < this.byteCounter) {
					const nextPos = nextPositionInSplit(
						splits,
						splitsToJoin,
						splitIndex,
						this.bufferPosition[sourceIndex] + 1
					);
					this.buffers[sourceIndex] = this.buffers[sourceIndex].slice(1);
					this.bufferPosition[sourceIndex] = nextPos;
				}

				if (this.bufferPosition[sourceIndex] === this.byteCounter) {
					if (this.buffers[sourceIndex].length > 0) {
						this.byteCounter++;

						outputBuffer.writeInt8(
							this.buffers[sourceIndex][0],
							outputBufferPos,
							true
						);
						if (outputBufferPos === outputBufferSize) {
							if (this.push(outputBuffer) === false) {
								this.paused = true;
							}
							outputBufferPos = 0;
						} else {
							outputBufferPos++;
						}
					}
				}

			});
		}
		if (outputBufferPos > 0) {
			if (this.push(outputBuffer.slice(0, outputBufferPos)) === false) {
				this.paused = true;
			}
			outputBufferPos = 0;
		}
	}

	source(stream) {
		const sourceIndex = this.sourceCounter;
		this.sourceCounter++;

		this.buffers[sourceIndex] = new Buffer('');

		stream.on('data', chunk => {
			this.buffers[sourceIndex] = Buffer.concat([
				this.buffers[sourceIndex],
				chunk
			]);
			if (typeof this.sourceSplits[sourceIndex] === 'undefined') {
				if (this.buffers[sourceIndex].length >= 3) {
					this.sourceSplits[sourceIndex] = {
						splits: this.buffers[sourceIndex][0],
						splitsToJoin: this.buffers[sourceIndex][1],
						splitIndex: this.buffers[sourceIndex][2]
					};
					this.buffers[sourceIndex] = this.buffers[sourceIndex].slice(3);

					if (sourceIndex > 0) {
						if (this.sourceSplits[sourceIndex].splits
								!== this.sourceSplits[0].splits) {
							throw new Error('Not same nr of splits in sources.');
						}
						if (this.sourceSplits[sourceIndex].splitsToJoin
								!== this.sourceSplits[0].splitsToJoin) {
							throw new Error('Not same nr of joins in sources.');
						}
						this.sourceSplits.filter((split, index) => {
							return index !== sourceIndex;
						}).forEach(split => {
							if (split.splitIndex ===
									this.sourceSplits[sourceIndex].splitIndex) {
								throw new Error('Same source used multiple times.');
							}
						});
					}

				}
				if (typeof this.sourceSplits[sourceIndex] !== 'undefined') {
					this.bufferPosition[sourceIndex] = nextPositionInSplit(
						this.sourceSplits[sourceIndex].splits,
						this.sourceSplits[sourceIndex].splitsToJoin,
						this.sourceSplits[sourceIndex].splitIndex,
						0
					);
				}
			}
			if (this.paused === false) {
				setImmediate(() => this.joinSources());
			}
		});
		stream.on('end', () => {
			this.sourcesEnded++;
			if (this.paused === false) {
				setImmediate(() => this.joinSources());
			}
		});
	}

}

module.exports = Join;
