var Queue = require('better-queue');
var print_email_queue = new Queue(function (inputs, cb) {
	sails.log.info(' - ' + new Date() + '(print-email-pdf - helper) BEGINS ================================');
	sails.log.info(' - ' + new Date() + ', (print-email-pdf - helper) consignee has an email address = ' + inputs.to_email_address);
	const fileExists = require('file-exists');
	//console.log(1);
	//var invoice_num = ''+inputs.invoice_number;
	var iscommandset = false;
//console.log(2);
	var wkhtmltopdf = require('wkhtmltopdf');
	//console.log(3);
	const os = require('os');
	//console.log(4);
	var response = {};
//console.log(5);
	if (os.platform() == 'linux' && fileExists.sync('/usr/bin/wkhtmltopdf')){
//		console.log(6);
		wkhtmltopdf.command = 'xvfb-run /usr/bin/wkhtmltopdf';
		iscommandset = true;
	}
	if (os.platform() == 'win32' && fileExists.sync(sails.config.globals.win32_wkhtmltopdf_path)){
		wkhtmltopdf.command = sails.config.globals.win32_wkhtmltopdf_path;
		iscommandset = true;
	}

	if(iscommandset) {
		sails.log.info(' - ' + new Date() + ', requesting for PDF generation');
		wkhtmltopdf(inputs.url, { pageSize: 'A4', output: inputs.filename , debugJavascript: true, debugStdOut: true}, function(err, stream) {
			if(err) {
				sails.log.error(' - ' + new Date() +' ERR - (print-email-pdf - helper)' + err);
				response.error = 'Error while genrating invoice pdf';
				response.email_sent = false;
				setTimeout(function(){
					var del = require('delete');
					// async
					del([inputs.filename], function(err, deleted) {
						if (err){
							sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err);
						} else {
							sails.log.info(' - ' + new Date() + ', PDF deleted');
							// deleted files
						}

						cb(null, response);
					});
				}, 5000);
			} else {
				sails.log.info(' - ' + new Date() + ', (print-email-pdf - helper) PDF generation DONE, now sending email');
				sails.helpers.sendEmail.with({
					to: inputs.to_email_address,
					bcc: inputs.bcc,
					subject: inputs.email_subject,
					html: inputs.email_html_body,
					attachment: inputs.filename
				}).exec(function(err, sent_status) {
					sails.log.info(' - ' + new Date() + ', (print-email-pdf - helper) email sent successfully, now deleting the pdf');
					response.email_sent = sent_status.email_sent;
					setTimeout(function(){
						var del = require('delete');
						// async
						del([inputs.filename], function(err, deleted) {
							if (err){
								sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err);
							} else {
								sails.log.info(' - ' + new Date() + ', PDF deleted');
								// deleted files
							}

							cb(null, response);
						});
					}, 5000);
				});
			}
		});
	} else {
		sails.log.info(' - ' + new Date() + ', PDF command blank');
		response.email_sent = false;
		cb(null, response);
	}
}, { maxTimeout: 30000 });

module.exports = {

	friendlyName: 'Print Email PDF',


	description: '',


	inputs: {
		//invoice_number: {type: 'string'},
		//invoice_id: {type: 'string'},
		url: {type: 'string'},
		to_email_address: {type: 'string'},
		bcc: {type: 'string'},
		email_subject: {type: 'string'},
		email_html_body: {type: 'string'},
		filename: {type: 'string'},
		wait_for_response: {type: 'boolean', defaultsTo: false}
	},


	exits: {
	},


	fn: async function (inputs, exits) {
		sails.config.log.addINlog('' + new Date() + ', EMAIL REQUEST - ', JSON.stringify(inputs));
		print_email_queue.push(inputs, (err, result) => {
			if(inputs.wait_for_response) {
				exits.success(result);	
			}
		});
		if(inputs.wait_for_response == false) {
			exits.success({});
		}
	}
};
