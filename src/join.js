'use strict';

const stream = require('stream');
const uuid = require('./uuid');

function nextPositionInFragment(fragments, fragmentsToJoin, fragmentIndex, startPos) {
	let pos = startPos;
	while ((fragmentIndex + pos) % fragments >= fragments - fragmentsToJoin + 1) {
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
		this.sourceFragments = [];
		this.sourcesEnded = 0;
	}

	_read() {
		console.log('join::_read()');
		this.joinSources();
	}

	joinSources() {

		const outputBufferSize = 8192;
		const outputBuffer = new Buffer(outputBufferSize);
		let outputBufferPos = 0;

		this.paused = false;
		if (this.sourceCounter === 0) return;

		let lastByteCounter;
		console.log('lastByteCounter', lastByteCounter, 'byteCounter', this.byteCounter);
		while (lastByteCounter !== this.byteCounter) {

			lastByteCounter = this.byteCounter;

			console.log('sourcesEnded', this.sourcesEnded);
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

				const sourceFragment = this.sourceFragments[sourceIndex];
				const fragments = sourceFragment.fragments;
				const fragmentsToJoin = sourceFragment.fragmentsToJoin;
				const fragmentIndex = sourceFragment.fragmentIndex;

				while (this.bufferPosition[sourceIndex] < this.byteCounter) {
					const nextPos = nextPositionInFragment(
						fragments,
						fragmentsToJoin,
						fragmentIndex,
						this.bufferPosition[sourceIndex] + 1
					);
					this.buffers[sourceIndex] = this.buffers[sourceIndex].slice(1);
					this.bufferPosition[sourceIndex] = nextPos;
				}

				console.log('byteCounter', this.byteCounter, 'bufferPosition', this.bufferPosition);
				if (this.bufferPosition[sourceIndex] === this.byteCounter) {
					console.log('this.buffers[' + sourceIndex + '].length == ', this.buffers[sourceIndex].length);
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
			console.log('source#' + sourceIndex + ' got data.');
			this.buffers[sourceIndex] = Buffer.concat([
				this.buffers[sourceIndex],
				chunk
			]);
			if (typeof this.sourceFragments[sourceIndex] === 'undefined') {
				if (this.buffers[sourceIndex].length >= 20) {
					this.sourceFragments[sourceIndex] = {
						fragmentDataVersion: this.buffers[sourceIndex][0],
						splitUuid: uuid.bufferToUuid(this.buffers[sourceIndex].slice(1, 17)),
						fragments: this.buffers[sourceIndex][17],
						fragmentsToJoin: this.buffers[sourceIndex][18],
						fragmentIndex: this.buffers[sourceIndex][19]
					};
					this.buffers[sourceIndex] = this.buffers[sourceIndex].slice(20);

					if (sourceIndex > 0) {
						if (this.sourceFragments[sourceIndex].splitUuid
								!== this.sourceFragments[0].splitUuid) {
							throw new Error('Not the same split UUID.');
						}
						if (this.sourceFragments[sourceIndex].fragments
								!== this.sourceFragments[0].fragments) {
							throw new Error('Not same nr of fragments in sources.');
						}
						if (this.sourceFragments[sourceIndex].fragmentsToJoin
								!== this.sourceFragments[0].fragmentsToJoin) {
							throw new Error('Not same nr of joins in sources.');
						}
						this.sourceFragments.filter((fragment, index) => {
							return index !== sourceIndex;
						}).forEach(fragment => {
							if (fragment.fragmentIndex ===
									this.sourceFragments[sourceIndex].fragmentIndex) {
								throw new Error('Same source used multiple times.');
							}
						});
					}

				}
				if (typeof this.sourceFragments[sourceIndex] !== 'undefined') {
					this.bufferPosition[sourceIndex] = nextPositionInFragment(
						this.sourceFragments[sourceIndex].fragments,
						this.sourceFragments[sourceIndex].fragmentsToJoin,
						this.sourceFragments[sourceIndex].fragmentIndex,
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
