const stream = require('stream');

class Split extends stream.Writable {

	constructor(nrOfSplits, nrOfSplitsToJoin) {
		super();
		this.byteCount = 0;
		this.nrOfSplits = nrOfSplits;
		this.nrOfSplitsToJoin = nrOfSplitsToJoin;
		this.splits = [...Array(nrOfSplits)].map(() => new stream.Readable({
			read: () => {}
		}));
		this.splits.forEach((split, splitIndex) => {
			split.push(new Buffer([
				nrOfSplits,
				nrOfSplitsToJoin,
				splitIndex
			]));
		});
		this.on('finish', () => {
			this.splits.forEach((split, splitIndex) => {
				split.push(null);
			});
		});
	}

	_write(chunk, enc, next) {
		for (let counter = 0; counter < chunk.length; counter++) {
			this.splits.forEach((split, splitIndex) => {

				if ((splitIndex + this.byteCount) % this.nrOfSplits < this.nrOfSplits - this.nrOfSplitsToJoin + 1) {
					split.push(chunk.slice(counter, counter + 1));
				}

			});
			this.byteCount++;
		}
		next();
	}

}

module.exports = Split;
