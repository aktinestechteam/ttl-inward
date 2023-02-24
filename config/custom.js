/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // mailgunDomain: 'transactional-mail.example.com',
  // mailgunSecret: 'key-testkeyb183848139913858e8abd9a3',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …
	
	base_url: 'https://idos.ttgroupglobal.com',
	deployment_name: 'mumbai',	//	'paris'
	white_listed_emails: ['ffm@ucs.co.in'],

	irn_invoice_types: {
		invoice: 'INVOICE',
		dcm: 'DCM',
		cancel_invoice: 'CANCEL_INVOICE'
	},

	irn_job_status: {
		pending: 'PENDING', 
		failed: 'FAILED',
		done: 'DONE',
		error: 'ERROR'
	},

	e_invoice_supported: false,	//	When you are making it true/false, search for this variable across the software and just once check if all is what you wanted.

	allow_ffm_without_permission: false,	//	To allow uploading of FFM files without any approvals
	allow_awb_delete_without_permission: false,

	email_credentials_for: {
		read_email: {
			name: "read_email",	//	Have this value same as the parent's key name.
			email_id: "ffm@ttgroupglobal.com",	//	Jaz28010
			application_id: "d11e8e1e-ccf5-4da8-9562-5001421b9d27",
			client_id: "d11e8e1e-ccf5-4da8-9562-5001421b9d27",
			object_id: "10e1784e-a058-44c5-a009-6a5c890b6e39",
			tenant_id: "328ff087-8f0d-41d4-b71b-8b368174cd14",
			client_secret: "COz8Q~UKqWGBh.VuYE83R55CwTODueyOyVHC1b5V",
			access_token_name: "read_mail_access_token",
			access_token_expiry_name: "read_mail_access_token_expiry_name",
			refresh_token_name: "read_mail_refresh_token",
			redirect_url: "/azure/auth-redirect-read-email"
		},
		write_email: {
			name: "write_email",	//	Have this value same as the parent's key name.
			email_id: "IAGCIndiaImports@ttgroupglobal.com",	//	Import2019
			application_id: "d11e8e1e-ccf5-4da8-9562-5001421b9d27",
			client_id: "d11e8e1e-ccf5-4da8-9562-5001421b9d27",
			object_id: "10e1784e-a058-44c5-a009-6a5c890b6e39",
			tenant_id: "328ff087-8f0d-41d4-b71b-8b368174cd14",
			client_secret: "COz8Q~UKqWGBh.VuYE83R55CwTODueyOyVHC1b5V",
			access_token_name: "write_mail_access_token",
			access_token_expiry_name: "write_mail_access_token_expiry_name",
			refresh_token_name: "write_mail_refresh_token",
			redirect_url: "/azure/auth-redirect-write-email"
		}
	},
	
	//	sails.config.custom.access_allowed(req.user.role, 'User')
	//	sails.config.custom.access_allowed(req.user.role, 'AppAdmin')
	access_allowed(requested_roles, allowed_role) {
		//console.log(requested_roles);
		//console.log(allowed_role);
		let allowed = false;
		if(requested_roles.indexOf(allowed_role) != -1) {
			allowed = true;
		}
		
		return allowed;
	},
	
	//	FUCTIONS ALL BELOW 
	
	jsonResponse: function(errormsg, data) {
		
		let response = new Object();
		
		if(errormsg)
			response.errormsg = errormsg;
		
		if(data)
			response.data = data;
		
		return response;
	},
	
	getdumppath: function(purpose, fn) {
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		var day = date.getDate();

		var path_for_url = "/static_data/" + purpose + "/" + year + "/" + month + "/" + day + "/";
		var path = '.' + path_for_url;
		var mkdirp = require('mkdirp');
    
		mkdirp(path, function (err) {
			fn(err, path_for_url);
		});
	},
	
	normalizeDigitsToTwo: function(n) {
		return n < 10 ? '0' + n : n; 
	},
	
	normalizeDigitsTo3Digits: function(n) {
		if(n < 10)
			return '00' + n;
		if(n < 100)
			return '0' + n;
		
		return n;
	},
	
	getReadableDate: function(timestamp, showTime = false, date_separator = '-', time_separator = ':') {
		
		let readable_date = 'NA';
		
		if(_.isNumber(timestamp)) {
			let date = new Date(timestamp);
			readable_date = sails.config.custom.normalizeDigitsToTwo(date.getDate()) + date_separator + sails.config.custom.normalizeDigitsToTwo(date.getMonth()+1) + date_separator + date.getFullYear();
			
			if(showTime) {
				readable_date += ', ' + sails.config.custom.normalizeDigitsToTwo(date.getHours()) + time_separator + sails.config.custom.normalizeDigitsToTwo(date.getMinutes());
			}
		}
		
		return readable_date;
	},
	
	getTimestamp: function(date) {	//	To be used only if date is of format 01-Apr-18 or 20190330
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
				
				timestamp = (new Date(_.kebabCase(date_splits))).getTime();
			} else if(date.length === 8) {
				timestamp = (new Date(_.kebabCase([date.slice(0,4), date.slice(4,6), date.slice(6)]))).getTime();
			}
		}
		
		return timestamp;
	},

	leftPad: function (number, targetLength) {
		var output = number + '';
		while (output.length < targetLength) {
			output = '0' + output;
		}
		return output;
	},

	splitString: (str, lineLength) => {
		const arr = ['']
	  
		str.split(' ').forEach(word => {
		  if (arr[arr.length - 1].length + word.length > lineLength) arr.push('')
		  arr[arr.length - 1] += (word + ' ')
		})
	  
		return arr.map(v => v.trim())
	}
};
