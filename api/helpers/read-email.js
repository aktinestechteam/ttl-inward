/*	STEPS

	1. Create IMAP Object
	2. IMAP Listens for events - close, ready, error, mail, end
	3. IMAP fuctions are - [openBox], search, fetch, end, [closeBox]
	4. IMAP openBox will open specific mail box that exists on the server
	5. IMAP search will provide with UIDs
	6. IMAP fetch will provide us with each message from the connected inbox.
	7. Read each message from the fetch
	8. Read Subject line and the attachment
*/

const Imap = require('imap');
	
var imap;				//	Holds instance of current imap object
var current_mail_box;	//	Holds current mail box instance
var inspect = require('util').inspect;

var fs = require('fs');
var base64	= require('base64-stream');
var {promisify} = require('util');
var writeFileAsync = promisify(fs.writeFile);

var message_options = {
	bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)'/*, '1'*/],
	markSeen: true,
	struct: true
}

let initImap = function(xoauth2) {
	if(!imap) {
		
		imap = new Imap({
			//user: 'ffm@ttgroupglobal.com',//'ffm@ttgroupglobal.com', // idos19@outlook.com
			//user: 'idos2020@outlook.com',
			//password: 'Jaz28010',//'Jaz28010',	// idos2019
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
			attachmentOptions: { directory: "attachments/" }, // specify a download directory for attachments 
			xoauth2: xoauth2
		});
		
		registerImapListeners();
	}
			
	return imap;
}

let openImapConnection = async function() {
	/*if(!imap) {
		initImap();
	}*/
	if(imap) { 
		try {
			imap.connect();
		} catch (e) {console.log(e);}
	}
}

let closeImapConnection = function() {
	console.log('imap state before end = ' + imap.state);
	if(imap) {
		imap.end();
		console.log('imap state after end = ' + imap.state);
	}
}

let registerImapListeners = function() {
	if(imap) {
		console.log('registering imap listeners');
		
		imap.once('ready', on_imap_ready);
		imap.once('close', on_imap_close);
		imap.once('error', on_imap_error);
		imap.once('mail', on_imap_mail);
		imap.once('end', on_imap_end);
	}
}

let openMailBox = async function() {
	return new Promise((good, bad) => {
		if(can_use_imap()) {
			sails.config.log.addINlog('email-processing', 'openMailBox');
			imap.openBox('INBOX', false, function(err, box) {
				sails.config.log.addINlog('email-processing', 'openBox-INBOX');
				if (err) {
					print_error('E R R O R   I N   O P E N I N G   O F   I N B O X');
					logx(err);
					closeImapConnection();
					good(false);
					return;
					//throw err;
				}
				logx('I N B O X   I S   O P E N   N O W');
				print_imap_state();

				current_mail_box = box;

				sails.config.log.addOUTlog('email-processing', 'openBox-INBOX');
				good(true);
			});
			sails.config.log.addOUTlog('email-processing', 'openMailBox');
		} else {
			print_error('A V O I D E D   O P E N I N G   O F   I N B O X');
			good(false);
		}
	});
}

let closeMailBox = async function() {
	return new Promise((good, bad) => {
		if(can_use_imap() && is_mail_box_open())
			imap.closeBox(false, function(err) {
				current_mail_box = undefined;
				if(err) {
					print_error();
					good(false);
				} else {
					logx('M A I L   B O X   C O N N E C T I O N   C L O S E D');
					good(true);
				}
			});
		else {
			print_error('T H E R E   I S   N O   M A I L   B O X   T O   C L O S E');
			good(true);
		}
	});
}

let performReadMessages = async function() {
	logx('O P E N I N G   M A I L   B O X');
	let success = current_mail_box ? true : await openMailBox();
	
	let UIDs;
	if(success) {
		UIDs = await getUIDsOfUnreadMessages();
	}
	
	logx('UIDs = ' + JSON.stringify(UIDs));
	//await fetchMessageForUID(773);
	for(let i = 0; i < UIDs.length; i++) {
		let emailMessage = new EmailMessage(UIDs[i]);
		await emailMessage.fetchMessageForUID();
		logx('done reading message uid ' + UIDs[i])
	}
	
	await closeMailBox();
	closeImapConnection();
}

let getUIDsOfUnreadMessages = async function() {
	return new Promise(async (good, bad) => {
		if(can_use_imap()) {
			if(is_mail_box_open()) {
				let UIDs = await searchInbox();
				//logx(UIDs);
				good(UIDs);
			} else {
				print_error('T H E R E   I S   N O   M A I L   B O X   O P E N');
				good(false);
			}
		} else {
			print_error('C A N N O T   R E A D   I N B O X');
			good(false);
		}
	});
}

let searchInbox = async function() {
	return new Promise((good, bad) => {
		if(can_use_imap()) {
			let date = new Date();
			date.setDate(date.getDate() - 2);	//	Getting emails from past 2 dates
			imap.search(['UNSEEN',['FROM', sails.config.custom.white_listed_emails[0]],['SINCE', date]/*,['SUBJECT', 'IGMFORMAT']*/], function (err, UIDs) {
				if(err) {
					print_error('E R R O R   I N   S E A R C H I N G   M A I L   B O X');
					closeMailBox();
					logx(err);
					bad(err);
					return;
				}
				
				good(UIDs);
			});
		}			   
	});
}

function EmailMessage(uid) {
	
	this.uid = uid;
	
	this.subject;
	this.user;
	this.date;
	
	let self = this;
	
	this.printEmailMessage = function() {
		console.log('**********************');
		console.log('*> uid = ' + this.uid);
		console.log('*> subject = ' + this.subject);
		console.log('*> user = ' + this.user);
		console.log('*> date = ' + this.date);
		console.log('**********************');
	}
	
	this.fetchMessageForUID = function() {
		
		return new Promise((good, bad) => {
			if(imap) {
				imap.fetch(this.uid, message_options)
					.on('message', (msg, seqno) => {this.readEmailMessage(msg)})
					.once('error', err => {logx(error);print_error('E R R O R   R E A D I N G   E M A I L   UID = ' + this.uid);good(false);})
					.once('end', () => {console.log('end reading for uid = ' + this.uid); good(true);});
			}
		})
	}

	this.readEmailMessage = function(msg) {
		if(imap) {
			msg.on('body', this.on_email_body_rx)
				.once('attributes', this.on_email_attrs_rx)
				.once('end', () => {console.log('msg reading for uid = ' + this.uid);})
		}
	}

	this.on_email_body_rx = function(stream, info) {
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
			
			self.subject = String(data1.subject);
			self.user = String(data1.from);
			self.date = String(data1.date);
			
			self.printEmailMessage();
			
			//console.table(data1);
		});
	}

	this.on_email_attrs_rx = async function(attrs) {
		sails.config.log.addINlog('email-processing', 'on_email_attrs_rx');
		//logx('attrs = ' + JSON.stringify((attrs)));

		if (!isUserValid(self.user)){
			logx('sender :' + self.user);
			logx('Invalid user *****internal check for msg attributes');
		}
		else{
			logx('sender :' + self.user);
			let attachments = self.findAttachmentParts(attrs.struct);
			logx(self.user + '########## Has attachments: ' + attachments.length);
			for (let i = 0, len = attachments.length ; i < len; i++) {
				let attachment = attachments[i];
				logx(self.uid + ' Fetching attachment ' + (attachment.params ? attachment.params.name : "!!! OMG !!!"));
				let emailAttachment = new EmailAttachment(self.uid, self.subject, attachment);
				await emailAttachment.fetchEmailAttachment();
			}
		}
	}
	
	this.findAttachmentParts = function(struct, attachments) {
		try {
		sails.config.log.addINlog('email-processing', 'findAttachment');
		attachments = attachments ||	[];
		for (let i = 0, len = struct.length, r; i < len; ++i) {
			if (Array.isArray(struct[i])) {
				self.findAttachmentParts(struct[i], attachments);
			} else {
				if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
					attachments.push(struct[i]);
				}
			}
		}
		sails.config.log.addOUTlog('email-processing', 'findAttachment');
		return attachments;
		} catch (e) {console.log(e)}
	}
}

function EmailAttachment(uid, subject, attachment) {
	
	this.uid = uid;
	this.subject = subject;
	this.attachment = attachment;
	this.filename = attachment.params.name;
	this.encoding = attachment.encoding;
	
	let self = this;
	
	this.fetchEmailAttachment = function() {
		imap.fetch(this.uid , { //do not use imap.seq.fetch here
			bodies: [this.attachment.partID],
			struct: true
		}).on('message', this.readEmailAttachment);
	}
	
	this.readEmailAttachment = function(msg) {
		if(imap) {
			msg.on('body', self.on_attachment_body_rx)
				//.once('attributes', this.on_email_attrs_rx)
				.once('end', () => {console.log('attachment reading for uid = ' + self.uid);})
		}
	}
	
	this.on_attachment_body_rx = function(stream, info) {
		let subject_line_parts = self.validateSubject(self.subject);

		if(subject_line_parts.length === 3){
			let flight_number = subject_line_parts[0];
			let flight_date = new Date(subject_line_parts[1]);
			let station = subject_line_parts[2];							

			//let fileTimestamp = Math.round(Date.parse(date) / 1000);
			//logx('---------------------------------'+fileTimestamp);

			sails.config.custom.getdumppath('uploads/' + sails.config.custom.deployment_name + '/' + station, async function(err, path) {
				logx(err);
				logx(path);

				var writeStream = fs.createWriteStream(self.filename);

				writeStream.on('error', function(e) {
					sails.config.log.addINlog('email-processing', 'writeStream-error'); 
					console.error(e);
					sails.config.log.addOUTlog('email-processing', 'writeStream-error');
				});

				//stream.pipe(writeStream); this would write base64 data to the file.
				//so we decode during streaming using 
				switch(toUpper(self.encoding)) {
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

				let newFileName = (Date.now() + '_'+ self.filename);
				logx('this is new file name'+ newFileName);
				//	close this block is to correct the filename for storing purpose


				try {
					if (fs.existsSync(self.filename)) {
						logx('exists')
					} else {
						logx('not exists')
					}
				} catch(err) {
					console.error(err)
				}

				if(isNaN(flight_date) === false) {
					fs.rename(self.filename, sails.config.appPath + path + newFileName, async function(err){
						try {
						if(err) logx(err);
						console.log('+ + + + + + + + + + + + + + + + + + + + + + + + + FILE ADDED')
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
						} catch (e) {console.log(e)}
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
	
	this.validateSubject = function(subject) {
		try {
		sails.config.log.addINlog('email-processing', 'validateSubject');
		sails.config.log.addlogmin(3, 'email-processing', 'validateSubject', 'subject = ' + subject);

		//	BA199/20Aug19/DEL
		let subjectLine = subject ? subject.split('/') : [];
		if(subjectLine.length != 3)
			subjectLine = [];

		sails.config.log.addOUTlog('email-processing', 'validateSubject');
		return subjectLine;
		} catch (e) {console.log(e)}
	}
}

//	E V E N T S    H A N D L I N G
let on_imap_close = function () {console.log('[now its close]'); print_imap_state();}
let on_imap_ready = function () {
	console.log('[now its ready]'); print_imap_state();
	//setTimeout(() => {imap.end()} , 5000);
	//	Since we are now ready, connected and authenticated, we should connect to the inbox
	if(can_use_imap()) {
		performReadMessages();
	} else {
		print_error('I M A P   N O T   R E A D Y');
	}
}

let on_imap_error = function (err) {console.log('[now its error]'); logx(err); print_imap_state();}

let on_imap_mail = function (messageCount) {console.log('[now its mail with new message = ' + messageCount + ']'); print_imap_state();}

let on_imap_end = function () {console.log('[now its end]'); print_imap_state(); imap = undefined;}

/*let on_mail_box_open = function(err, box) {
	sails.config.log.addINlog('email-processing', 'openBox-INBOX');
	if (err) {
		print_error('E R R O R   I N   O P E N I N G   O F   I N B O X');
		logx(err);
		closeImapConnection();
		throw err;
	}
	logx('I N B O X   I S   O P E N   N O W');
	print_imap_state();
	
	current_mail_box = box;

	sails.config.log.addOUTlog('email-processing', 'openBox-INBOX');
}*/

/*let on_mail_box_closed = function(err) {
	if(err) {
		print_error();
	} else {
		current_mail_box = undefined;
		logx('M A I L   B O X   C O N N E C T I O N   C L O S E D');
	}
}*/

//	H E L P E R S
let can_use_imap = function() {
	return (imap && imap.state == 'authenticated');
}

let is_mail_box_open = function() {
	return current_mail_box != undefined;
}

let print_imap_state = function() {
	if(imap) {
		console.log('imap.state = ' + imap.state);
	} else {
		console.log('I M A P   I S   N U L L   O R   U N D E F I N E D');
	}
}

let logx = function(msg) {
	sails.config.log.addlog(3, 'System', 'email-processing logx' /*+ new Date()*/, msg);
}

let print_error = function(error_text) {
	logx('READ EMAIL ERROR - ' + error_text);
	print_imap_state();
}

function toUpper(thing) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing;}

function isUserValid(user){
	try {
	sails.config.log.addINlog('email-processing', 'isUserValid');
	sails.config.log.addOUTlog('email-processing', 'isUserValid');
	
	let isValid = false;
	if(user) {
		for(let i = 0; i < sails.config.custom.white_listed_emails.length; i++) {
			isValid = (user.indexOf(sails.config.custom.white_listed_emails[i]) != -1);
			if(isValid)
				break;
		}
	}
		
	return isValid;
	} catch (e) {console.log(e)}
}

process.on('uncaughtException', function (error) {
	logx('- x - x - x - x - x - x - uncaughtException - x - x - x - x - x - x -');
	logx(error);
	logx(JSON.stringify(error));
	logx(imap.state)
});

module.exports = {

	friendlyName: 'Read Emails',

	description: 'Validate each received email and handle attachments',

	inputs: {},

	exits: {
		success: {
			outputDescription: "Email's are valid .",
		}
	},
	//function check's for each email id if we found invalid email then we return json with index of invalid email and status true if success and false on failure.
	fn: async function (inputs, exits) {
		
		if(sails.config.environment == 'development') {
			//  MOBIGIC return exits.success();
		}

		let response = await sails.helpers.azure.getAuthTokens.with({for: sails.config.custom.email_credentials_for.read_email.name});
		if(response.errormsg) {
			sails.config.log.addlog(0, 'READ_EMAIL', 'HELPER', response.errormsg, "", "READ_EMAIL", "");
			return exits.success();
		}

		let access_token = await Settings.findOne({key: sails.config.custom.email_credentials_for.read_email.access_token_name});
		if(!access_token || !access_token.value) {
			sails.config.log.addlog(0, 'READ_EMAIL', 'HELPER', "The token does not exists for reading email", "", "READ_EMAIL", "");
			return exits.success();
		}

		let email = sails.config.custom.email_credentials_for.read_email.email_id;
        let xoauth2 = Buffer.from(`user=${email}${Buffer.from('01', 'hex').toString('ascii')}auth=Bearer ${access_token.value}${Buffer.from('0101', 'hex').toString('ascii')}`).toString('base64');

		print_imap_state();
		if(can_use_imap()) {
			//	Its a re-entry for imap, and since it is already created, we will not re-init.
			
			//	Since we have imap already available.
			//	Check if mail box is open for read, if it is open then read messages. If not, then we can open it first and read msgs
			if(is_mail_box_open()) {
				//await closeMailBox();	//	temporary checks while developing - To be deleted
				//await closeImapConnection();	//	temporary checks while developing - To be deleted
			} else {
				//openMailBox();
				//performReadMessages();
			}

			performReadMessages();
			
			exits.success();
			return;
		}
		try {
			initImap(xoauth2);
			//registerImapListeners();	//	This is now done directly once we have the imap being created. registering multiple times leads to callback being called as many times.
			openImapConnection();
			//closeImapConnection();
		} catch (e) {console.log(e);}
		
		exits.success();
	}
};


//	initImap
//	openImapConnection
//	registerImapListeners
//	openMailBox
//	searchInbox
//	fetchMessageForUID
//	readEmailMessage
//	closeImapConnection



//try{} catch (e) {console.log(e)} finally {console.log('-------- finally 1')}
