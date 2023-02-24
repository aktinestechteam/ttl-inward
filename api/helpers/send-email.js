var Queue = require('better-queue');
var send_email_queue = new Queue(async function (inputs, cb) {
	//	Disabling the EMAIL since we do not have the email account via which the sending of email should happen
	if(sails.config.environment == 'development') {
		console.log('sending email to ' + inputs.to + ', with subject = ' + inputs.subject);
		console.log(inputs.body);
		console.log(inputs.html);
		console.log('E M A I L   I S   D I S A B L E D')
		cb(null, true);
		return;
	}
	
//sails.log.info(JSON.stringify(inputs));
	if(inputs.to === '') {
		cb(null, true);
		return;
	}
	
	const nodemailer = require('nodemailer');

	// create reusable transporter object using the default SMTP transport

	let response = await sails.helpers.azure.getAuthTokens.with({for: sails.config.custom.email_credentials_for.write_email.name});

	if(response.errormsg) {
		sails.config.log.addlog(0, 'SEND_EMAIL', 'HELPER', response.errormsg, "", "SEND_EMAIL", "");
		cb(null, false);
		return;
	}

	let access_token = await Settings.findOne({key: sails.config.custom.email_credentials_for.write_email.access_token_name});
	if(!access_token || !access_token.value) {
		sails.config.log.addlog(0, 'SEND_EMAIL', 'HELPER', "The token does not exists for sending email", "", "SEND_EMAIL", "");
		cb(null, false);
		return;
	}

	let transporter = nodemailer.createTransport({
		host: 'smtp.office365.com',
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			// user: 'IAGCIndiaImports@ttgroupglobal.com', // generated ethereal user
			// pass: sails.config.environment == 'development' ? "nopassword" : 'Import2019'  // generated ethereal passwod
			type: 'OAuth2',
			user: sails.config.custom.email_credentials_for.write_email.email_id,//'support@vnops.in',
			accessToken: `${access_token.value}`,
		},
		requireTLS : true,
		debug: true,
		logger: true, 
	});
	// setup email data with unicode symbols
	let mailOptions = {};
	mailOptions.from = sails.config.custom.email_credentials_for.write_email.email_id;//'IAGCIndiaImports@ttgroupglobal.com'; // sender address

	if(inputs.to)
		mailOptions.to = inputs.to; // list of receivers
	if(inputs.bcc)
		mailOptions.bcc = inputs.bcc;	// list of all receivers in bcc
	if(inputs.subject)
		mailOptions.subject = inputs.subject; // Subject line
	if(inputs.body)
		mailOptions.text = inputs.body; // plain text body
	if(inputs.html)
		mailOptions.html = inputs.html; // html body
	if(inputs.attachment)
		mailOptions.attachments = [{
			filename: inputs.attachment.substr(inputs.attachment.indexOf('/')+1),
			path: inputs.attachment,
			contentType: 'application/pdf'
		}];
	// send mail with defined transport object
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			sails.log.error(' - ' + new Date() +' ERR - (send-email-queue - helper)' + error);
			sails.log.error(' - ' + new Date() +' ERR - (send-email-queue - helper)' + info);
			cb(err, false); 
		} else {
			cb(null, true);
		}
	});
}, { maxTimeout: 20000 });

module.exports = {


	friendlyName: 'Send email',


	description: '',


	inputs: {
		to:			{type: 'string'},
		cc:			{type: 'string'},
		bcc:		{type: 'string'},

		subject:	{type: 'string'},

		body:		{type: 'string'},
		html:		{type: 'string'},

		attachment:	{type: 'string'}
	},


	exits: {

	},


	fn: function (inputs, exits) {
		send_email_queue.push(inputs, function(error, result) {
			if (error) {
				sails.log.error(' - ' + new Date() +' ERR - (send-email - helper)' + error);
				exits.success({email_sent: false});
			} else {
				exits.success({email_sent: true});
			}
		});
	}
};
