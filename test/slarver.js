const expect = require('chai').expect;
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

	it('can split streams and then join them', function() {
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

});
