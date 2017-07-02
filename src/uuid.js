function bufferToUuid(buf) {
	const hexVal = buf.toString('hex');
	return hexVal.substr(0, 8) + '-'
		+ hexVal.substr(8, 4) + '-'
		+ hexVal.substr(12, 4) + '-'
		+ hexVal.substr(16, 4) + '-'
		+ hexVal.substr(20);
}

module.exports = {
	bufferToUuid
}
