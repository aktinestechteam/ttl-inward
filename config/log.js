/**
 * Built-in Log Configuration
 * (sails.config.log)
 *
 * Configure the log level for your app, as well as the transport
 * (Underneath the covers, Sails uses Winston for logging, which
 * allows for some pretty neat custom transports/adapters for log messages)
 *
 * For more information on the Sails logger, check out:
 * https://sailsjs.com/docs/concepts/logging
 */

 var winston = require('winston');
 require('winston-daily-rotate-file');

 const customLogger = winston.createLogger({
  level: 'silly',
  //format: winston.format.json(),
  transports: [
  	new winston.transports.DailyRotateFile({
			name: 'file',
			datePattern: 'YYYY-MMM-DD',
			filename: 'idos_%DATE%.txt',
			level: 'silly',
			zippedArchive: true,
			dirname: 'log'
		}),
    /*new winston.transports.DailyRotateFile({
			name: 'file',
			datePattern: 'YYYY-MMM-DD',
			filename: 'log/idos_log_info_',
			level: 'info'
		})*/
  ],
  exitOnError: false
});

function addlog(level, username, method, message, reference = '-', operation = '-', department = '-') {
	let d = new Date();
	let logdata = {
		//date: sails.config.custom.normalizeDigitsToTwo(d.getHours()) + ':' + sails.config.custom.normalizeDigitsToTwo(d.getMinutes()) + ':' + sails.config.custom.normalizeDigitsToTwo(d.getSeconds()) + '|' + sails.config.custom.normalizeDigitsTo3Digits(d.getMilliseconds()), 
		//username: '' + (username ? username : 'anonymous'), //	adding if we receive username as number
		method: '' + method, 
		message: '' + message,
		//reference: reference,
		//operation: operation,
		//department: department
	};
	switch(level) {
		case 0: sails.log.error(logdata); break;	//	ERROR
		case 1: sails.log.warn(logdata); break;		//	WARN
		case 2: sails.log.debug(logdata); break;	//	DEBUG
		case 3: sails.log.info(logdata); break;		//	INFO
		case 4: sails.log.verbose(logdata); break;	//	VERBOSE
		case 5: sails.log.silly(logdata); break;	//	SILLY
	}
}

 module.exports.log = {
   // Pass in our custom logger, and pass all log levels through.
   //custom: customLogger,
   // Disable captain's log so it doesn't prefix or stringify our meta data.
   inspect: false,
	 
	 addlog: function(level, username, method, message, reference, operation, department) {
		addlog(level, username, method, message, reference, operation, department);
	},

	//	sails.config.log.addlog(3, req.user.email, req.options.action, "log statement from loginget");
	addlogmin: function(level, username, method, message) {
		addlog(level, username, method, message);
	},
	
	//	sails.config.log.addINlog(req.user.email, req.options.action);
	addINlog: function(username, method) {
		addlog(3, username, method, 'IN');
	},
	
	//	sails.config.log.addOUTlog(req.user.email, req.options.action);
	addOUTlog: function(username, method) {
		addlog(3, username, method, 'OUT');
	},
 };
