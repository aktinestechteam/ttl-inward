/*

Basic Usage
-----------
0. Configure for:
	a. error_text_size in px (defaults 12)
	b. error_color - The color of error text (defaults red)
	c. error_class -  Choose a name that will not conflict with the class that is in use (defaults error_class).
	d. error_display_html (defaults true). If you set false, each validation should include the text as value for the key as text. Eg. text: 'something to validate'
	e. text_min - minimum text input expected  (defualts 2)
	f. text_max - maximum text input expected  (defualts 50)
	g. highlight_all_errors - highlights all the errors together after validation if set to true. If set to false will display one error at a time in sequence as defined (defaults: false)
	
1. Define an array of validations to be performed
2. For each validation minimum input to be provided should be
	a. tagid - tag id of the tag to be validated
	b. regex_name - regex to be used for validation
	c. text - (optional if config.error_display_html is true, if false, then mandatory)
	d. errmsg - the error msg to be shown to the user in case the validation fails for that tag
	e. required - if true, tells the engine to verify the empty value too. If false and the value is left empty then it will be considered ok. (default - false)
	
	
regex_name options
------------------

1. email - checks for validity of email address format
2. exact_x_digits - checks for x digits (mostly used for PINcode, PIN, or Phone number)
	a. x_count - number defining the number of digits (e.g. 10) - (defaults 100)
3. any_number - checks for number
	- allow_negative - (defaults false). if set true, allows negative numbers
	- allow_decimal - (defaults false), if set true, allows to enter decimal numbers
4. text - validates for text containing a-z, A-Z and 0-9
	- allow_numbers - you can numbers with text (defaults false) 
	- other_chars - mention all the charactes you want to allow in a string
	- min - minimum string length (defaults 2)
	- max - maximum string length (defaults 50)
5. free_text - validates for any free text for it's lenths
	- min - minimum string length (defaults 2)
	- max - maximum string length (defaults 50)
6. min_number - validates if the entered number is greater than minimum (true) or not (false)
	- min - minimum value to be checked
7. max_number - validates if the entered number is less than maximum (true) or not (false)
	- max - maximum value to be checked
8. equal - checks if two tags are holding same value or not
	- tag2id - tagid of the other input tag
	returns true if two strings are equal, else false. Returns false if both the strings are empty
9. filepath - checks if the file selection is done
	returns true if a file is selected else returns false. checks for full path, relative path path with font/back slash
	[special case]
		- namecheck - startswith, endswith, contains, exact, extension
		- checkname - the value of the name that should be checked as per the namecheck rule selected		
		returns true if the namecheck succeeds else false
	


let validation_input = [
	{tagid: 'input_email1', text: 'naval@mobigic.com', regex_name: 'email', errmsg: 'Email address entered is invalid.'},
	{tagid: 'quantity', text: '0', regex_name: 'any_number', errmsg: 'Only Digits are allowed for Quantity.'},
	{tagid: 'phone', text: '9876543210', regex_name: 'any_number', errmsg: 'the number should be decimal number', allow_negative: false, allow_decimal: true},
	{tagid: 'address', text: 'Brindavan', regex_name: 'text', errmsg: 'Address Error', allow_numbers: true, min: 3, other_chars: ' ', max: 5},
];

validate(validation_input); //	returns [true/false] if error_display_html is true, else returns [true/{errmsg: 'errmsg', tagid: 'tagid'}]


*/

//	Configuration to be done here
var config = {
	error_text_size: 12,
	error_color: 'red',
	error_class: 'error_class',// + new Date().getTime(),
	error_display_html: true,
	text_min: 2,
	text_max: 50,
	highlight_all_errors: false
};

//	All Regex to be defined here
var regexes = {
	email: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
	//only_digits: function(allow_negative){return new RegExp('^' + (allow_negative ? '([-+]?)' : '') + '\\d+$')}, ///^\d+$/,
	exact_x_digits: function(x) {return new RegExp('^[0][1-9]\\d{' + (x-1) + '}$|^[1-9]\\d{' + (x-1) + '}$');},	//	{exact_digit_count}
	//positive_whole_number: /^\d*[1-9]\d*$/,
	any_number: function(allow_negative, allow_decimal) {
		return new RegExp('^' + 
		(allow_negative ? '([-+]?)' : '') + 
		'\\d+' + 
		(allow_decimal ? '(\\.\\d+)?' : '') + '$')
	},	//	allows non-decimal numbers also
	//decimal_number_only: /^\d+(\.\d+)$/,	//	allows decimal numbers only with atleast 1 place after decimal
	decimal_2_places: /^(\d{1,5}|\d{0,5}\.\d{1,2})$/,
	x_dot_y: function(x_digits, y_digits) {return new RegExp('^([\\d]{0,' + x_digits + '})(\\.[\\d]{1,' + y_digits + '})?$');},	//	match with this returns value of x and value of y
	text: function(allow_numbers, other_chars, min, max) {
		return new RegExp(
			"^[a-zA-Z" +
			(allow_numbers ? "0-9" : "") + 
			(other_chars ? other_chars : "") + 
			"]{" + (min ? min : config.text_min) + "," + (max ? max : config.text_max) + "}$"
		);
	},
	filepath: /(\\\\?([^\\/]*[\\/])*)([^\\/]+)$/,
}

//console.log(regexes['text'](true, ' .\',-\\[\\]',3, 40));
//console.log(regexes['text'](true, ' ',3, 40));

var regex_validation = {
	email: function(text, validation_input) {
		return text.match(regexes['email']);
	},
	/*only_digits: function(text, validation_input) {
		return text.match(regexes['only_digits'](validation_input.allow_negative));
	},*/
	//	requires {exact_digit_count}, else defaults 100
	exact_x_digits: function(text, validation_input) {
		return text.match(regexes['exact_x_digits'](validation_input.x_count ? validation_input.x_count : 100));
	},
	any_number: function(text, validation_input) {
		return text.match(regexes['any_number'](validation_input.allow_negative, validation_input.allow_decimal));
	},
	/*decimal_number_only: function(text, validation_input) {
		return text.match(regexes['decimal_number_only']);
	}*/
	text: function(text, validation_input) {
		return text.match(regexes['text'](validation_input.allow_numbers, validation_input.other_chars, validation_input.min, validation_input.max));
	},
	free_text: function(text, validation_input) {
		let success = false;
		let len = text.length;
		if(len >= (validation_input.min ? validation_input.min : config.text_min) && len <= (validation_input.max ? validation_input.max : config.text_max)) {
			success = true;
		}

		return success;
	},
	min_number: function(text, validation_input) {
		let success = false;
		try {
			let n = Number(text);
			success = (n >= validation_input.min);
		} catch(e) {

		}

		return success;
	},
	max_number: function(text, validation_input) {
		let success = false;
		try {
			let n = Number(text);
			success = (n <= validation_input.max);
		} catch(e) {

		}

		return success;
	},
	equal: function(text, validation_input) {
		let success = false;
		
		let tagid1 = validation_input.tagid;
		let tagid2 = validation_input.tag2id;
		
		if(tagid1 && tagid2) {
			let text1 = $('#'+tagid1).val();
			let text2 = $('#'+tagid2).val();

			if(text1.length > 0 && text2.length > 0 && text1.length == text2.length && text1 === text2)
				success = true;
		}
		
		return success;
	},
	filepath: function(text, validation_input) {
		let success = false;
		let namecheck = validation_input.namecheck;
		
		let match_text = text.match(regexes['filepath']);
		let filename;
		
		if(match_text) {
			filename = match_text[match_text.length-1];
			switch(namecheck) {
				case 'startswith':
					success = filename.startsWith(validation_input.checkstring);
					break;
				case 'endswith': 
					success = filename.endsWith(validation_input.checkstring);
					break;
				case 'contains':
					success = filename.indexOf(validation_input.checkstring) != -1;
					break;
				case 'exact':
					success = filename === validation_input.checkstring;
					break;
				case 'extension':
					success = filename.endsWith('.' + validation_input.checkstring);
					break;
				default:
					success = match_text;
					break;
			}
		}
		
		return success;
	}
}

//var s = '-8.5552';
//console.log(s.match(regexes['decimal_number']));

function validate(input) {
	//	Clear once before validation
	clearDisplayingError()

	let all_valid = true;
	let i = 0;
	for( ; i < input.length; i++) {
		console.log('' + i + '. ' + input[i].tagid);

		let text = config.error_display_html ? getValueForValidation(input[i].tagid) : input[i].text;
		console.log(text);
		//	There can be a case where the field is not required and hence not filled by the user, so we should consider it good.
		if(!text && !input[i].required) {} else {
			let valop = regex_validation[input[i].regex_name](text, input[i]);
			console.log(valop);
			if(!valop) {
				all_valid = false;
				setDisplayingError(input[i].tagid, input[i].errmsg);
			}
		}

		if(config.error_display_html) {
			if(config.highlight_all_errors)
				continue;
			else
				if (!all_valid)
					break;
		} else {
			if (!all_valid)
				break;
		}	
	}

console.log('--- ' + all_valid);
	return all_valid ? 
		(config.error_display_html ? true : true) : 
		(config.error_display_html ? false : {tagid: input[i].tagid, errmsg: input[i].errmsg});
}

function getValueForValidation(tagid) {
	let jq_tag = $('#' + tagid);
	let tagName = jq_tag.prop('tagName');

	let value = ''
	if(tagName === 'INPUT') {
		value = jq_tag.val();
	}

	return value;
}

function clearDisplayingError() {
	if(config.error_display_html)
		$('span.' + config.error_class).remove();
}

function setDisplayingError(tagid, errmsg) {
	if(config.error_display_html) {
		$('#' + tagid).after('<span class="error_class", style="color: ' + config.error_color + '; font-size: ' + config.error_text_size + 'px">' + errmsg + '<span>');
		$('#' + tagid).focus();
	}
}