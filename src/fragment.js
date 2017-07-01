const stream = require('stream');

class Fragment extends stream.Readable {

	constructor() {
		super();
	}

	_read() {
		console.log('--');
		if (this.fragmentsPaused > 0) {
			this.fragmentsPaused--;
		}
		console.log(this.fragmentsPaused);
		if (this.fragmentsPaused === 0) {
			console.log('Fragment emitting drain event.');
			this.emit('drain');
		}
	}

}

module.exports = Fragment;
