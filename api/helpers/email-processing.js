
var Imap = require('imap'),
inspect = require('util').inspect;
var fs = require('fs');
var base64	= require('base64-stream');
var {promisify} = require('util');
var writeFileAsync = promisify(fs.writeFile);
var Queue = require('better-queue');
var imap = new Imap({
	user: 'ffm@ttgroupglobal.com', // idos19@outlook.com
	//user: 'idos2020@outlook.com',
	password: 'Jaz28010',	// idos2019
	//password: 'amd@th10n',
	//host: 'imap.gmail.com',
	host: 'outlook.office365.com',
	port: 993,
	tls: true,
	connTimeout: 10000, // Default by node-imap 		
	authTimeout: 5000, // Default by node-imap, 		
	debug: logx, // Or your custom function with only one incoming argument. Default: null 		
	tlsOptions: { rejectUnauthorized: false },		
	mailbox: "INBOX", // mailbox to monitor 		
	searchFilter: ["UNSEEN"/*, "FLAGGED"*/], // the search filter being used after an IDLE notification has been retrieved 		
	markSeen: true, // all fetched email willbe marked as seen and not fetched next time 		
	fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`, 		
	mailParserOptions: { streamAttachments: true }, // options to be passed to mailParser lib. 		
	attachments: true, // download attachments as they are encountered to the project directory 		
	attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments 
});

function logx(msg) {
	sails.config.log.addlog(3, 'System', 'email-processing', msg);
}

/////////////////////////////////////////////////////////////IMAP INITIALIZATION ////////////////////////////////

imap.once('close', function() {
	sails.config.log.addINlog('email-processing', 'imap-close');
	logx('Connection closed');
	/*setTimeout(()=>{
		imap.connect();
		logx('RESTARTIG IMAP CONNECTION');
	}, 5000);*/
	sails.config.log.addOUTlog('email-processing', 'imap-close');
});

imap.once('ready', function() {
	sails.config.log.addINlog('email-processing', 'imap-ready');
	openMailBox();
	sails.config.log.addOUTlog('email-processing', 'imap-ready');
});

imap.once('error', function(err) {
	sails.config.log.addINlog('email-processing', 'imap-error');
	logx(err);
	sails.config.log.addlogmin(0, 'email-processing', 'imap-error', err);
	sails.config.log.addOUTlog('email-processing', 'imap-error');
});

imap.once('end', function() {
	sails.config.log.addINlog('email-processing', 'imap-end');
	logx('Connection ended');
	sails.config.log.addOUTlog('email-processing', 'imap-end');
});

imap.on('mail', function(numNewMsgs) {
	sails.config.log.addINlog('email-processing', 'imap-mail');
	logx('[' + numNewMsgs +'] - New Emails');
	sails.config.log.addlogmin(3, 'email-processing', 'imap-mail', '[' + numNewMsgs +'] - New Emails');

	email_queue.push(numNewMsgs);
	//mailProcessing();
	sails.config.log.addOUTlog('email-processing', 'imap-mail');
});

function toUpper(thing) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing;}

function findAttachmentParts(struct, attachments) {
	sails.config.log.addINlog('email-processing', 'findAttachment');
	attachments = attachments ||	[];
	for (var i = 0, len = struct.length, r; i < len; ++i) {
		if (Array.isArray(struct[i])) {
			findAttachmentParts(struct[i], attachments);
		} else {
			if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
				attachments.push(struct[i]);
			}
		}
	}
	sails.config.log.addOUTlog('email-processing', 'findAttachment');
	return attachments;
}

function buildAttMessageFunction(attachment, user, subject, date/*, messageId*/) {
	//sails.config.log.addINlog('email-processing', 'buildAttMessageFunction');
	let filename = attachment.params.name;
	let encoding = attachment.encoding;
	let received_from = String(user);
	//let msg_id = String(messageId);

	return function (single_msg, seqno) {
		sails.config.log.addINlog('email-processing', 'buildAttMessageFunction for single_msg');
		logx('---' + user + '---' + subject + '---' + date);
		var prefix = '(#' + seqno + ') ';

		single_msg.on('body', async function(stream, info, res) {
			let reason = '';
			sails.config.log.addINlog('email-processing', 'single_msg-body');
			//Create a write stream so that we can stream the attachment to file;
			logx(prefix + 'Streaming this attachment to file', filename, info);

		//////////////////here we have to validate user and if validate then only go for attachments storing/////////
			if (!isUserValid(user)){
				logx('sender :' + user);
				logx('Invalid user');
				reason = 'email received from unexpected source';
			}
			else{
				logx('sender :' + user);
				let subject_line_parts = validateSubject(subject);

				if(subject_line_parts.length === 3){
					let flight_number = subject_line_parts[0];
					let flight_date = new Date(subject_line_parts[1]);
					let station = subject_line_parts[2];							

					//let fileTimestamp = Math.round(Date.parse(date) / 1000);
					//logx('---------------------------------'+fileTimestamp);

					sails.config.custom.getdumppath('uploads/' + sails.config.custom.deployment_name + '/' + station, async function(err, path) {
						logx(err);
						logx(path);

						var writeStream = fs.createWriteStream(filename);

						writeStream.on('error', function(e) {
							sails.config.log.addINlog('email-processing', 'writeStream-error'); 
							console.error(e);
							sails.config.log.addOUTlog('email-processing', 'writeStream-error');
						});

						//stream.pipe(writeStream); this would write base64 data to the file.
						//so we decode during streaming using 
						switch(toUpper(encoding)) {
							case 'BASE64': 
								stream.pipe(new base64.Base64Decode()).pipe(writeStream);
								break;
							case 'QUOTED-PRINTABLE': 
								stream.pipe(new base64.QuotedPrintableDecode()).pipe(writeStream);
								break;
							default: 
								stream.pipe(writeStream);
								break;
						}
						/*if (toUpper(encoding) === 'BASE64') {
							//the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
							stream.pipe(new base64.Base64Decode()).pipe(writeStream);
						//	splitDate(data);
						} else	{
							//here we have none or some other decoding streamed directly to the file which renders it useless probably
							stream.pipe(writeStream);
						//	splitDate(data);
						}*/

						let newFileName = (Date.now() + '_'+ filename);
						logx('this is new file name'+ newFileName);
						//	close this block is to correct the filename for storing purpose


						try {
							if (fs.existsSync(filename)) {
								logx('exists')
							} else {
								logx('not exists')
							}
						} catch(err) {
							console.error(err)
						}

						if(isNaN(flight_date) === false) {
							fs.rename(filename, sails.config.appPath + path + newFileName, async function(err){
								if(err) logx(err);
								
								let validate_igm_response = await sails.helpers.validateIgm.with({
									igm_filepath: sails.config.appPath + path + newFileName, 
									username: 'file-integrity-check', 
									igmCity: station, 
									igmNumber: 0, 
									igmDate: flight_date.getTime(), 
									inwardDate: flight_date.getTime(), 
									flightNumber: flight_number
								});
								
								let igm_pending = await IgmPending.create({
									//igm_number: 
									//igm_date:
									flight_number: flight_number,
									flight_date: flight_date.getTime(),
									//inward_date:
									uploaded_by: 'email',
									filepath: path + newFileName,
									igm_city: station,
									status: validate_igm_response.err ? 'corrupt file' : 'available'
								});
							});
						} else {
							reason = 'The date received is invalid = ' + subject_line_parts[1];
						}
					});
				} else {
					logx('invalid subject id.******error');//stop here bcz subject line is invalid
					reason = 'Invalid Subjectline';
				}
			}

			let count = await Email.count({subject: subject});
			logx('count = ' + count + ', updating reason = ' + reason);
			if(count > 0) {
				await Email.update({subject: subject}).set({reason: reason});
			}

			sails.config.log.addOUTlog('email-processing', 'single_msg-body');
		});

		single_msg.once('end', function() {
			sails.config.log.addINlog('email-processing', 'msg-end');
			logx(prefix + 'Finished attachment %s', filename);
			sails.config.log.addOUTlog('email-processing', 'msg-end');

		});
		sails.config.log.addOUTlog('email-processing', 'buildAttMessageFunction for single_msg');
	};
}


/////////////////////////////////////////////////////////user defined functions////////////////


// this fun is to validate the mailid of user
function isUserValid(user){
	sails.config.log.addINlog('email-processing', 'isUserValid');
	sails.config.log.addOUTlog('email-processing', 'isUserValid');
	
	let isValid = false;
	for(let i = 0; i < sails.config.custom.white_listed_emails.length; i++) {
		isValid = (user.indexOf(sails.config.custom.white_listed_emails[i]) != -1);
		if(isValid)
			break;
	}
		
	return isValid;
}

// this function is to identifi the awb from subjectline with regex
function validateSubject(subject) {
	sails.config.log.addINlog('email-processing', 'validateSubject');
	sails.config.log.addlogmin(3, 'email-processing', 'validateSubject', 'subject = ' + subject);

	//	BA199/20Aug19/DEL
	let subjectLine = subject ? subject.split('/') : [];
	if(subjectLine.length != 3)
		subjectLine = [];

	sails.config.log.addOUTlog('email-processing', 'validateSubject');
	return subjectLine;
}



// this is function to open the inbox at once only when this process get initiated
function openMailBox() {
	sails.config.log.addINlog('email-processing', 'openMailBox');
	imap.openBox('INBOX', false, function(err, box) {
		sails.config.log.addINlog('email-processing', 'openBox-INBOX');
		if (err) {
			imap.end();
			throw err;
		} 
		sails.config.log.addOUTlog('email-processing', 'openBox-INBOX');
	//logx(box);
	});
	sails.config.log.addOUTlog('email-processing', 'openMailBox');
}

// this is function to call the mail processing
//function mailProcessing(numNewMsgs){
var email_queue = new Queue(function (numNewMsgs, cb) {
	sails.config.log.addINlog('email-processing', 'email_queue');
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing
	//sails.config.log.addINlog('helper', 'send-email-queue');
	let date = new Date();
	date.setDate(date.getDate() - 2);	//	Getting emails from past 2 dates
	imap.search(['UNSEEN',['FROM', sails.config.custom.white_listed_emails[0]],['SINCE', date]/*,['SUBJECT', 'IGMFORMAT']*/], function (err, results) {
		sails.config.log.addINlog('email-processing', 'imap.search-UNSEEN');
		if (err) throw err;
		//logx(results);
			// let unread = {};
			// unread = results;
			// logx('unread array------'+unread);

		if(results && results.length > 0) {
			var f = imap.fetch(results, {
				bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)'/*, '1'*/],
				markSeen: true,
				struct: true
			});

			f.on('message', function (msg, seqno) {
				sails.config.log.addINlog('email-processing', 'f.on-message');
				logx('Message #%d', seqno);
				var buffer ='';

				let subject;
				let user;
				let date;
				//let messageId;

				var prefix = '(#' + seqno + ') ';
				msg.on('body', function(stream, info) {
					logx(prefix + '*******************************')
					logx(prefix + info)
					sails.config.log.addINlog('email-processing', 'msg.on-body');
					let buffer = '';					
					stream.on('data', function(chunk) {
						buffer += chunk.toString('utf8');
					});

					stream.once('end', function() {
						sails.config.log.addINlog('email-processing', 'strem.once-end');
					//	let data = (prefix + 'Parsed header1234: %s', inspect(Imap.parseHeader(buffer)));
					//	logx(data);
						//logx(prefix + 'Parsed header$$$$$$$$$$$: %s', inspect(Imap.parseHeader(buffer)));
						logx('---------------------------------------------------------------------------------');
						var data1 = [];
						data1 = Imap.parseHeader(buffer);
						subject = String(data1.subject);
						user = String(data1.from);
						date = String(data1.date);
						//messageId = String(data1['message-id']);
						/*fs.writeFile("./EMAIL.txt", buffer, function(err) {
							if(err) {
								return logx(err);
							}

							logx("The file was saved!");
						}); */
						//logx(data2);
						sails.config.log.addOUTlog('email-processing', 'strem.once-end');
					});
					sails.config.log.addOUTlog('email-processing', 'msg.on-body');
				});

				msg.once('attributes', function(attrs) {
					sails.config.log.addINlog('email-processing', 'msg.once-attributes');
					logx(inspect(attrs));
					
					if (!isUserValid(user)){
						logx('sender :' + user);
						logx('Invalid user *****internal check for msg attributes');
					}
					else{
						logx('sender :' + user);
						var attachments = findAttachmentParts(attrs.struct);
						logx(user + ' Has attachments: %d', attachments.length);
						for (var i = 0, len=attachments.length ; i < len; i++) {
							var attachment = attachments[i];
							logx(prefix + 'Fetching attachment %s', attachment.params ? attachment.params.name : "!!! OMG !!!");
							var f = imap.fetch(attrs.uid , { //do not use imap.seq.fetch here
								bodies: [attachment.partID],
								struct: true
							});
							//build function to process attachment message
							if (!attachment)
								logx('no any attachment');
							else{
								logx(attachment);
								f.on('message', buildAttMessageFunction(attachment, user, subject, date));	//, messageId));
							}
						}
					}
					sails.config.log.addOUTlog('email-processing', 'msg.once-attributes');
				});
				msg.once('end', async function() {
					sails.config.log.addINlog('email-processing', 'msg.once-end');
					logx(prefix + 'Finished email');
					let count = await Email.count({subject: subject});
					if(count === 0) {
						let data = await Email.create({ subject: (isUserValid(user) ? '' : 'X-') + subject, from: user, reason: (isUserValid(user) ? '' : 'Rx from invalid user')}).fetch().catch(err => logx(err));
						
						if(data) {
							logx(prefix + 'data inserted successfuly in Email model');
						}
					}
					sails.config.log.addOUTlog('email-processing', 'msg.once-end');
				});

				sails.config.log.addOUTlog('email-processing', 'f.on-message');
			});

			f.once('error', function(err) {
				sails.config.log.addINlog('email-processing', 'f.once-error');
				logx(prefix + 'Fetch error: ' + err);
				sails.config.log.addOUTlog('email-processing', 'f.once-error');
			});

			f.once('end', function() {
				sails.config.log.addINlog('email-processing', 'f.once-end');
				logx('Done fetching all messages!');
				sails.config.log.addOUTlog('email-processing', 'f.once-end');
				cb();
				imap.end();
			});
		} else {
			cb();
		}
		sails.config.log.addOUTlog('email-processing', 'imap.search-UNSEEN');
	});
	sails.config.log.addOUTlog('email-processing', 'email_queue');
});


module.exports = {

	friendlyName: 'Email Processing',

	description: 'Validate each received email and handle attachments',

	inputs: {},

	exits: {
		success: {
			outputDescription: "Email's are valid .",
		}
	},
	//function check's for each email id if we found invalid email then we return json with index of invalid email and status true if success and false on failure.
	fn: function (inputs, exits) {
		imap.connect();
		sails.config.log.addlogmin(3, 'email-processing', 'imap-connect', 'initiated IMAP connection');
		exits.success();
	}
};
