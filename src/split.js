'use strict';

const crypto = require('crypto');
const Fragment = require('./fragment');
const stream = require('stream');

class Split extends stream.Writable {

	constructor(nrOfFragments, nrOfFragmentsToJoin) {
		super();
		this.uuid = crypto.randomBytes(16);

		this.byteCount = 0;
		this.nrOfFragments = nrOfFragments;
		this.nrOfFragmentsToJoin = nrOfFragmentsToJoin;
		this.fragmentsPaused = 0;
		this.fragments = [...Array(nrOfFragments)]
			.map((val, index) => new Fragment(index, this));
		this.on('finish', () => {
			this.fragments.forEach((fragment, fragmentIndex) => {
				fragment.push(null);
			});
		});
	}

	_write(chunk, enc, callback) {
		//console.log('Split::_write()');
		if (this.fragmentsPaused !== 0) {
			//console.log(' - called when fragmentsPaused !== 0');
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
		this.fragmentsPaused = this.fragments.map((fragment, fragmentIndex) => {
			return fragment.push(buffers[fragmentIndex].slice(0, bufferPos[fragmentIndex]));
		}).reduce((paused, res) => {
			if (res === false) {
				paused++;
			}
			return paused;
		}, 0);
		if (this.fragmentsPaused === 0) {
			callback(null);
		} else {
			this.onNoPausedFragments = callback;
		}
	}

	_writev(chunks, callback) {
		this._write(
			Buffer.concat(chunks.map(chunk => {
				if (Buffer.isBuffer(chunk.chunk)) {
					return chunk.chunk;
				}
				return Buffer.from(chunk.chunk, chunk.encoding);
			})),
			null,
			callback
		);

	}

}

module.exports = Split;
