const splits = 5;
const splitsToJoin = 3;

const crypto = require('crypto');
const stream = require('stream');
const slarver = require('./index');

const split = new slarver.Split(splits, splitsToJoin);
const originalStream = new stream.Readable();

originalStream._read = function() {
	while (this.push(crypto.pseudoRandomBytes(1024)) === true) {
	}
};
originalStream.pipe(split);

const joinedStream = new slarver.Join();
joinedStream.source(split.splits[0]);
joinedStream.source(split.splits[2]);
joinedStream.source(split.splits[3]);

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
	byteCounter = 0;
	if (global.gc) {
		global.gc();
	}
}, 1000);

