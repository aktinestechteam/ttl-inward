function normalizeDigitsToTwo(n) {
	return n < 10 ? '0' + n : n; 
}

function getReadableDate(timestamp, showTime = false, date_separator = '-', time_separator = ':') {		
	let readable_date = 'NA';

	if(!isNaN(timestamp)) {
		let date = new Date(timestamp);
		readable_date = normalizeDigitsToTwo(date.getDate()) + date_separator + normalizeDigitsToTwo(date.getMonth()+1) + date_separator + date.getFullYear();

		if(showTime) {
			readable_date += ', ' + normalizeDigitsToTwo(date.getHours()) + time_separator + normalizeDigitsToTwo(date.getMinutes());
		}
	}

	return readable_date;
}

function getTimestamp(date) {	//	To be used only if date is of format 01-Apr-18 or 20190330
	let timestamp = 0;
	if(date) {
		let date_splits = date.split('-');
		if(date_splits.length === 3) {
			let currentYear = (new Date()).getFullYear();
			let shortYear = Number(date_splits[2]);
			if(shortYear > currentYear - 2000) {	//	which means short year belongs to 20th century
				date_splits[2] = '' + (1900 + shortYear);
			} else {
				date_splits[2] = '' + (2000 + shortYear);
			}

			timestamp = (new Date(date_splits[0] + '-' + date_splits[1] + '-' + date_splits[2])).getTime();
		} else if(date.length === 8) {
			timestamp = (new Date(_.kebabCase([date.slice(0,4), date.slice(4,6), date.slice(6)]))).getTime();
		}
	}

	return timestamp;
}