'use strict';

const Fragment = require('./fragment');
const stream = require('stream');

class Split extends stream.Writable {

	constructor(nrOfFragments, nrOfFragmentsToJoin) {
		super();
		this.byteCount = 0;
		this.nrOfFragments = nrOfFragments;
		this.nrOfFragmentsToJoin = nrOfFragmentsToJoin;
		this.fragmentsPaused = 0;
		this.fragments = [...Array(nrOfFragments)].map(() => new Fragment());
		this.fragments.forEach((fragment, fragmentIndex) => {
			fragment.push(new Buffer([
				nrOfFragments,
				nrOfFragmentsToJoin,
				fragmentIndex
			]));
		});
		this.on('finish', () => {
			this.fragments.forEach((fragment, fragmentIndex) => {
				fragment.push(null);
			});
		});
	}

	_write(chunk, enc, next) {
		console.log('Split::_write()');
		if (this.fragmentsPaused !== 0) {
			console.log(' - called when fragmentsPaused !== 0');
			return; 
		}

		const buffers = [];
		const bufferPos = [];
		this.fragments.forEach((fragment, fragmentIndex) => {
			buffers[fragmentIndex] = new Buffer(chunk.length);
			bufferPos[fragmentIndex] = 0;
		});

		for (let counter = 0; counter < chunk.length; counter++) {
			buffers.forEach((buffer, fragmentIndex) => {

				if ((fragmentIndex + this.byteCount) % this.nrOfFragments < this.nrOfFragments - this.nrOfFragmentsToJoin + 1) {
					buffer.writeInt8(
						chunk[counter],
						bufferPos[fragmentIndex],
						true
					);
					bufferPos[fragmentIndex]++;
				}

			});
			this.byteCount++;
		}
		this.fragments.forEach((fragment, fragmentIndex) => {
			if (fragment.push(buffers[fragmentIndex].slice(0, bufferPos[fragmentIndex])) === false) {
				console.log('++');
				this.fragmentsPaused++;
			}
		});
		next(null);
	}

}

module.exports = Split;
