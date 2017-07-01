const stream = require('stream');

class Fragment extends stream.Readable {

	constructor() {
		super();
	}

	_read() {
		console.log('--');
		if (this.splitsPaused > 0) {
			this.splitsPaused--;
		}
		console.log(this.splitsPaused);
		if (this.splitsPaused === 0) {
			console.log('split emitting drain event.');
			this.emit('drain');
		}
	}

}

module.exports = Fragment;
