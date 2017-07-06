const crypto = require('crypto');
const expect = require('chai').expect;
const fs = require('fs');
const slarver = require('../index');
const stream = require('stream');

describe('Slarver', () => {

	it('should have a Join propery which is a Readable stream class', () => {
		const join = new slarver.Join();
		expect(join).to.be.an.instanceof(stream.Readable);
	});

	it('should have a Split propery which is a Writable stream class', () => {
		const split = new slarver.Split();
		expect(split).to.be.an.instanceof(stream.Writable);
	});

	it('can split small streams and then join them', function() {
		this.timeout(10000);
		let result = new Promise((resolve, reject) => { resolve(); });

		const testStr = 'Alfred was here.';

		for (let fragments = 2; fragments <= (testStr.length * 2) + 1; fragments++) {
			for (let fragmentsToJoin = 2; fragmentsToJoin <= fragments; fragmentsToJoin++) {

				((fragments, fragmentsToJoin) => {
					result = result.then(() => {
						return new Promise((resolve, reject) => {

							const split = new slarver.Split(fragments, fragmentsToJoin);
							const originalStream = new stream.Readable();
							originalStream.pipe(split);

							const joinedStream = new slarver.Join();

							split.fragments.reduce((acc, s) => {
								acc.push(s);
								return acc.sort(() => 0.5 - Math.random());
							}, []).filter((s, sindex) => {
								return sindex < fragmentsToJoin;
							}).forEach((s) => {
								joinedStream.source(s);
							});

							const result = [];
							joinedStream.on('data', chunk => {
								result.push(chunk);
							});
							joinedStream.on('end', () => {
								try {
									expect(Buffer.concat(result).toString()).to.equal(testStr);
									resolve();
								} catch (err) {
									reject(err);
								}
							});
							originalStream.push(new Buffer(testStr));
							originalStream.push(null);

						});
					});
				})(fragments, fragmentsToJoin);

			}
		}

		return result;

	});

	it('can split large streams and then join them', function() {
		this.timeout(60000);
		const testfile0 = '/tmp/slarver-test-0';
		const testfile1 = '/tmp/slarver-test-1';

		const nullStream = new stream.Writable({
			write: (chunk, enc, cb) => setImmediate(cb)
		});

		return new Promise((resolve, reject) => {
			fs.writeFileSync('/tmp/slarver-test-0', crypto.pseudoRandomBytes(1024 * 1024 * 10));
			const shasum = crypto.createHash('sha1');
			const file = fs.ReadStream(testfile0);
			file.on('data', data => shasum.update(data));
			file.on('end', () => resolve(shasum.digest('hex')));
		})
		.then(checksum0 => new Promise((resolve, reject) => {
			const splitter = new slarver.Split(5, 3);
			fs.createReadStream(testfile0).pipe(splitter);
			const joiner = new slarver.Join();

			splitter.fragments[0].pipe(nullStream);
			joiner.source(splitter.fragments[1]);
			splitter.fragments[2].pipe(nullStream);
			joiner.source(splitter.fragments[3]);
			joiner.source(splitter.fragments[4]);

			const outputFile = fs.createWriteStream(testfile1);
			joiner.pipe(outputFile);
			outputFile.on('finish', () => {
				resolve(checksum0);
			});
		}))
		.then(checksum0 => new Promise((resolve, reject) => {
			fs.writeFileSync('/tmp/slarver-test-0', crypto.pseudoRandomBytes(1024 * 1024 * 10));
			const shasum = crypto.createHash('sha1');
			const file = fs.ReadStream(testfile0);
			file.on('data', data => shasum.update(data));
			file.on('end', () => resolve([checksum0, shasum.digest('hex')]));
		}))
		.then(([checksum0, checksum1]) => {
			expect(checksum0).to.equal(checksum1);
		});

	});


});
