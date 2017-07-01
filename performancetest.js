'use strict';

const splits = 5;
const splitsToJoin = 3;

const crypto = require('crypto');
const fs = require('fs');
const heapdump = require('heapdump');
const stream = require('stream');
const slarver = require('./index');

const split = new slarver.Split(splits, splitsToJoin);
const originalStream = new stream.Readable();

originalStream._read = function() {
	console.log('originalStream._read()');
	while (this.push(crypto.pseudoRandomBytes(1024)) === true) {
		console.log('originalStream just created 1024 bytes of randomness');
	}
	console.log('originalStream just created 1024 bytes of randomness');
};
originalStream.pipe(split);

split.on('drain', () => console.log('split drained'));

const joinedStream = new slarver.Join();
joinedStream.source(split.splits[0]);
joinedStream.source(split.splits[1]);
joinedStream.source(split.splits[2]);
joinedStream.source(split.splits[3]);
joinedStream.source(split.splits[4]);

let byteCounter = 0;
joinedStream.on('data', chunk => {
	byteCounter += chunk.length;
});

setInterval(() => {
	const mem = process.memoryUsage();
	console.log(
		Math.round(byteCounter / 1024) + 'kb/s, mem:' +
		mem.rss / 1048576 + 'mb/' + mem.heapTotal / 1048576 + 'mb/' + mem.heapUsed / 1048576 + 'mb'
	);
	if (global.gc) {
		global.gc();
	}
	heapdump.writeSnapshot((err, filename) => {
		fs.rename(filename, 'heapdump-' + Math.round(byteCounter / 1024) + '.heapsnapshot');
	});
	byteCounter = 0;
}, 1000);

