'use strict';

const Fragment = require('./fragment');
const stream = require('stream');

class Split extends stream.Writable {

	constructor(nrOfSplits, nrOfSplitsToJoin) {
		super();
		this.byteCount = 0;
		this.nrOfSplits = nrOfSplits;
		this.nrOfSplitsToJoin = nrOfSplitsToJoin;
		this.splitsPaused = 0;
		this.splits = [...Array(nrOfSplits)].map(() => new Fragment());
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
		console.log('split::_write()');
		if (this.splitsPaused !== 0) {
			console.log(' - called when splitsPaused !== 0');
			return; 
		}

		const buffers = [];
		const bufferPos = [];
		this.splits.forEach((split, splitIndex) => {
			buffers[splitIndex] = new Buffer(chunk.length);
			bufferPos[splitIndex] = 0;
		});

		for (let counter = 0; counter < chunk.length; counter++) {
			buffers.forEach((buffer, splitIndex) => {

				if ((splitIndex + this.byteCount) % this.nrOfSplits < this.nrOfSplits - this.nrOfSplitsToJoin + 1) {
					buffer.writeInt8(
						chunk[counter],
						bufferPos[splitIndex],
						true
					);
					bufferPos[splitIndex]++;
				}

			});
			this.byteCount++;
		}
		this.splits.forEach((split, splitIndex) => {
			if (split.push(buffers[splitIndex].slice(0, bufferPos[splitIndex])) === false) {
				console.log('++');
				this.splitsPaused++;
			}
		});
		next(null);
	}

}

module.exports = Split;
