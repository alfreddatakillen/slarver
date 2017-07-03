const stream = require('stream');

class Fragment extends stream.Readable {

	constructor(fragmentIndex, split) {
		super();

		this.fragmentIndex = fragmentIndex;
		this.split = split;

		// Make the data format header in the the beginning of the stream:

		this.push(new Buffer([1])); // Data format version 1.
		this.push(this.split.uuid); // Split identification
		this.push(new Buffer([
			// Info about the split arrangement:
			this.split.nrOfFragments,
			this.split.nrOfFragmentsToJoin,
			fragmentIndex
		]));
	}

	_read() {
		console.log('--');
		if (this.split.fragmentsPaused > 0) {
			this.split.fragmentsPaused--;
		}
		console.log(this.fragmentsPaused);
		if (this.split.fragmentsPaused === 0) {
			console.log('Fragment emitting drain event.');
			this.split.emit('drain');
		}
	}

}

module.exports = Fragment;
