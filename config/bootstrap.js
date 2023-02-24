/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also do this by creating a hook.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */

//	Cron link https://cronexpressiondescriptor.azurewebsites.net/?expression=0+0+22+30%2C31+*+*&locale=en

var cron =  require('node-cron');
var mkpath = require('mkpath');

module.exports.bootstrap = async function(done) {

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return done();
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

	creatSoftLinks();
	// creating pdf appPath
	makepdfpath();
	makeloggerpath();
	// //	Every minute
	/*cron.schedule('* * * * *', function() {
		console.log('CRON running every minute ' + new Date());
		//generateInvoiceForCreditPeriod('15 Days');
		makeloggerpath();
	});*/

	//	Every 12 AM
	cron.schedule('0 0 * * *', function() {
		sails.log.info('' + new Date() + 'CRON running every 12 AM ' + new Date());
		makepdfpath();
		makeloggerpath();
	});

	//	Every 05:00 AM
	cron.schedule('0 5 * * *', function() {
		sails.log.info('' + new Date() + 'CRON running every 05:00 AM ' + new Date());
		sendEmailOfPendingPayment();
		sendEmailForDelayWithScannedFFM();
	});

	//	weekly - 0 0 1 * * 6 - At 01:00 AM, only on Saturday
	cron.schedule('0 0 1 * * 6', function() {
		sails.log.info('' + new Date() + 'CRON running every saturday ' + new Date());
		generateInvoiceForCreditPeriod('7 Days');

	});

	//	1st by fortnight - 0 0 1 1 * * - At 01:00 AM, on day 1 of the month
	cron.schedule('0 0 1 1 * *', function() {
		sails.log.info('' + new Date() + 'CRON running every 1st of month (2nd fortnight) ' + new Date());
		generateInvoiceForCreditPeriod('15 Days');
	});

	//	16th by fortnight - 0 0 1 16 * * - At 01:00 AM, on day 16 of the month
	cron.schedule('0 0 1 16 * *', function() {
		sails.log.info('' + new Date() + 'CRON running every 16th of month (1st fortnight) ' + new Date());
		generateInvoiceForCreditPeriod('15 Days');
	});

	//	Month - 0 0 1 1 * * - At 01:00 AM, on day 1 of the month
	cron.schedule('0 0 1 1 * *', function() {
		sails.log.info('' + new Date() + 'CRON running every 1st of month (monthly) ' + new Date());
		generateInvoiceForCreditPeriod('30 Days');
	});

	if(sails.config.environment == 'production') {
		cron.schedule('*/15 * * * *', function() {console.log(new Date()); kickStartEmailProcessing();});
	}
	//kickStartEmailProcessing();
	
	// Don't forget to trigger `done()` when this bootstrap function's logic is finished.
	// (otherwise your server will never lift, since it's waiting on the bootstrap)
	return done();

};

function creatSoftLinks() {
	setTimeout(function()
	{
		let softlinknames = ['static_data'];
		let shell = require('shelljs');
		
		for(let i = 0; i < softlinknames.length; i++) {
			shell.mkdir("-p", './' + softlinknames[i]);

			let lnk = require('lnk');
			lnk([softlinknames[i]], '.tmp/public').then(() => console.log(softlinknames[i] + ' created')).catch((err)=>console.log(err));
		}
	},10000);
}

function kickStartEmailProcessing() {
	console.log("before emailProcessing");
	sails.helpers.readEmail.with({}, function(err) {
		if (err){
			console.log(err);
		}
		console.log('returned from helper');
	});
	console.log("after emailProcessing");
	
}

function makepdfpath() {
	var pdfpath = 'pdf/'
	mkpath(pdfpath, function (err) {
			if (err)
				sails.log.error('' + new Date() + 'Error in creating pdf path');
			else
				sails.log.info('' + new Date() + 'pdf path created');
	});
}

function makeloggerpath() {
	var logpath = 'log/'
	mkpath(logpath, function (err) {
			if (err)
				sails.log.error('' + new Date() + 'Error in creating logger path');
			else
				sails.log.info('' + new Date() + 'logger path created');
	});
}

function generateInvoiceForCreditPeriod(credit_period) {

	//	Find all the congignees that belong to this credit_period
	//	For each such consignee, search for all the AWBs that are void_on = 0, invoice_document = ''

	sails.config.globals.async.waterfall([
		function(callback) {
			Address.find({credit_period: credit_period}, function(err, consignees) {
				if(err) {
					sails.log.error('' + new Date() + err);
					callback('Error in searching for the consignees for the period ' + credit_period);
				} else {
					if(consignees) {
						sails.log.info('' + new Date() + 'Found ' + consignees.length + ' consignees');
						callback(null, consignees);
					} else {
						callback('There are no consignees for the period ' + credit_period, null);
						sails.log.info('' + new Date() + 'There are no consignees for the period ' + credit_period);
					}
				}
			});
		},
		function(consignees, callback) {
			sails.config.globals.async.eachSeries(consignees, function(consignee, each_callback) {
				sails.log.info('' + new Date() + 'working for the consignee = ' + consignee.id + ', name = ' + consignee.name);
				sails.config.globals.async.series({
					awb_user_datas: function(series_callback){
						AwbUserData.find({consignee:consignee.id, void_on: 0, invoice_document: '', do_document: {'!=':''}}, function(err, awb_user_datas) {
							if(err) {
								sails.log.error('' + new Date() + err);
								series_callback('error in finding the AWB user Datas', null);
							}
							else {
								sails.log.info('' + new Date() + 'working for AWBs of count ' + awb_user_datas.length);
								if(awb_user_datas.length > 0)
									series_callback(null, awb_user_datas);
								else
									series_callback('could not find any AWBUserData for invoicing', null);
							}
						});
					},
					dcms: function(series_callback) {
						DCM.find({consignee: consignee.id, invoiced_under_invoice_id: ''}, function(err, dcms){
							if(err) {
								sails.log.error(err);
								series_callback('error in finding the DCMs for this customer', null);
							}
							else {
								sails.log.error('' + new Date() + 'found ' + dcms.length + ' dcms');
								series_callback(null, dcms);
							}
						});
					}
				}, function(err, results) {	//	async.series
					if(err) {
						sails.log.error('' + new Date() + err);
						sails.log.error('' + new Date() + 'cannot generate the invoice for consignee = ' + consignee.id);
						each_callback();
					} else {
						if(results && results.awb_user_datas.length > 0) {
							//	get today's date
							//	subtract 1 day from today's date and that will give you period_to
							//	subtract provided days - 1 from today's date and that will give you period_from
							var is_2nd_fn = false;
							var credit_period_to = new Date();
							
							if(credit_period_to.getDate() === 1)
								is_2nd_fn = true;
							
							credit_period_to.setDate(credit_period_to.getDate() - 1);
							credit_period_to.setHours(23);
							credit_period_to.setMinutes(59);
							credit_period_to.setSeconds(59);

							var credit_period_from = new Date();

							if(credit_period === '7 Days')
								credit_period_from.setDate(credit_period_from.getDate() - 7);
							else if(credit_period === '15 Days') {
								if(is_2nd_fn === true) {
									credit_period_from.setMonth(credit_period_from.getMonth() - 1);
									credit_period_from.setDate(16);
								} else {
									credit_period_from.setDate(1);
								}
							} else if(credit_period === '30 Days') {
								credit_period_from.setMonth(credit_period_from.getMonth() - 1);
								credit_period_from.setDate(1);
							}

							credit_period_from.setHours(0);
							credit_period_from.setMinutes(0);
							credit_period_from.setSeconds(1);

							sails.log.info('' + new Date() + 'Just before requesting for issuance of Invoice for consignee = ' + consignee.name);

							sails.helpers.issueInvoice.with({
								awb_user_datas: results.awb_user_datas,
								dcms: results.dcms,
								credit_period_from: credit_period_from.getTime(),
								credit_period_to: credit_period_to.getTime(),
								generated_by: 'System on ' + credit_period
							}).exec(function(err, invoice) {
								if(invoice.error) {
									//res.send(invoice);	//	We are sending the error that is sent in the object called invoice.
									sails.log.error('' + new Date() + 'Error occrured while generating invoice at cron job');
									each_callback();
								} else {
									sails.log.info('' + new Date() + 'Invoice generated successfully for consignee = ' + consignee.id + ', name = ' + consignee.name);
									each_callback();
								}
							});
						}
						else {
							sails.log.info('' + new Date() + 'There are no awb for the consignee = ' + consignee.id);
							each_callback();
						}
					}
				});
			}, function(err) {	//	async.each
				if(err) {
					sails.log.error('' + new Date() + err);
					sails.log.error('' + new Date() + 'An error occured in each loop');
					callback(null, true);
				} else {
					sails.log.info('' + new Date() + 'For each completes')
					callback(null, true);
				}
			});
		}
	], function(err, result) {
		if(err) {
			sails.log.error('' + new Date() + err);
		} else {
			sails.log.info('' + new Date() + 'CRON for period ' + credit_period + ' , completed !');
			sails.helpers.sendEmail.with({
				to: 'lawrence.pereira@ttgroupglobal.com, naval@mobigic.com, mayuresh@mobigic.com',
				subject: 'Credit Invoice - ' + credit_period,
				html: '<p>' + new Date() + ' - CRON for period ' + credit_period + ' , completed !</p>'
			}, function(err, status){
				if(err) {
					sails.log.info('intimation email to teams failed');
					sails.log.info(err);
				} else {
					sails.log.info('intimation email to teams done');
				}
			});
		}
	});
}

function sendEmailOfPendingPayment() {
	//	Identify those Invoices, which are issued more than 3 days ago and whose payments are not yet received.
	//	Send the email about the data over the email.
	var cut_off_date = new Date();
	cut_off_date.setDate(cut_off_date.getDate() - 3);
	var cut_off_date_ts = cut_off_date.getTime();

	CityConstants.find({and: [
		{ expires_on: { '>': cut_off_date_ts }},
		{ effective_from: { '<': cut_off_date_ts }}
	]}, function(err, constants) {
		if(err) {
			sails.log.error(err);
			sails.log.error('Error occured while finding city constants while sending email  of pending payments');
		} else {
			sails.config.globals.async.each(constants, function(constant, callback) {
				if(!constant.line_manager_email) {
					sails.log.info('CRON - There is no line manager defined for the city ' + constant.iata_code);
					callback();
				} else {
					Invoice.find({where: {
						and: [
							{igm_city: constant.iata_code},
							{void_on: 0},
							{payment_received_date: 0},
							{invoice_issue_date: {'<=': cut_off_date_ts}},
						]
					}}, async function(err, invoices){
						if(err) {
							sails.log.error(err);
							sails.log.error('CRON - Error while finding the invoices by CRON for finding pending payments')
							callback();
						} else {
							var tr_tags = '';
							for(var i = 0; i < invoices.length; i++) {
								let awb_user_datas = await AwbUserData.find({id: invoices[i].awb_user_datas});
								var issue_date = new Date(invoices[i].invoice_issue_date);
								var tr_tag = '<tr><td>' + issue_date.getDate() + '-' + (issue_date.getMonth() + 1) + '-' + issue_date.getFullYear() + '</td><td>' + invoices[i].invoice_number + '</td><td>' + (awb_user_datas ? awb_user_datas[0].consignee_name : '') + '</td><td>' + sails.config.globals.price_formatter(Math.ceil(invoices[i].amount_billed)) + '</td></tr>';
								tr_tags += tr_tag;
							}

							if(invoices && invoices.length > 0) {
								sails.helpers.sendEmail.with({
									to: constant.line_manager_email,
									subject: 'Invoices - Pending Payment',
									html: '<table border="1"><thead><th>Invoice Date</th><th>Invoice Number</th><th>Amount</th></thead><tbody>' + tr_tags + '</tbody></table>'
								}, function(err, status){
									if(err) {
										sails.log.error('CRON - Error while sending - Pending Payment list is sent to ' + constant.iata_code + ' line manager');
										sails.log.error(err);
									} else {
										sails.log.info('CRON - Pending Payment list is sent to ' + constant.iata_code + ' line manager');
									}
									callback();
								});
							} else {
								sails.log.info('CRON - Pending Payment list - No invoices found for ' + constant.iata_code);
								callback();
							}
						}
					});
				}
			})
		}
	});
}

async function sendEmailForDelayWithScannedFFM() {
	let now_date = Date.now();
	let cities = await CityConstants.find({expires_on: {'>': now_date}});
	for(let i = 0; i < cities.length; i++) {
		let upload_pending_scanned_ffms = await ScannedFFM.find({
			igm_city: cities[i].iata_code,
			createdAt: {'<' : now_date},
			status: 'upload_pending',
		}).populate('igm');

		let upload_pending_scanned_ffm_tr_tags = undefined;
		for(let i = 0; i < upload_pending_scanned_ffms.length; i++) {
			if(upload_pending_scanned_ffm_tr_tags == undefined)
				upload_pending_scanned_ffm_tr_tags = '';

			upload_pending_scanned_ffm_tr_tags += (
				'<tr>' + 
					'<td>' + upload_pending_scanned_ffms[i].igm_city + '</td>' +
					'<td>' + upload_pending_scanned_ffms[i].igm.igm_number + '</td>' +
					'<td>' + upload_pending_scanned_ffms[i].igm.flight_number + '</td>' +
					'<td>' + sails.config.custom.getReadableDate(upload_pending_scanned_ffms[i].igm.flight_date) + '</td>' +
					//'<td>' + upload_pending_scanned_ffms[i].igm.uploaded_by + '</td>' +
					'<td>' + sails.config.custom.getReadableDate(upload_pending_scanned_ffms[i].createdAt, true) + '</td>' +
				'</tr>'
			);
		}

		let upload_pending_scanned_ffm_html = undefined;
		if(upload_pending_scanned_ffm_tr_tags) {
			upload_pending_scanned_ffm_html = (
				'<table border="1">' + 
					'<thead>' + 
						'<th>IGM City</th>' + 
						'<th>IGM Number</th>' + 
						'<th>Flight Number</th>' + 
						'<th>Flight Date</th>' + 
						//'<th>Uploaded By</th>' + 
						'<th>Uploaded Date</th>' + 
					'</thead>' + 
					'<tbody>' + upload_pending_scanned_ffm_tr_tags + '</tbody>' + 
				'</table>'
			);
		}

		let approval_pending_scanned_ffms = await ScannedFFM.find({
			igm_city: cities[i].iata_code,
			createdAt: {'<' : (now_date - (2 * 24 * 60 * 60 * 1000))},
			status: 'approval_pending',
		}).populate('igm');


		let approval_pending_scanned_ffm_tr_tags = undefined;
		for(let i = 0; i < upload_pending_scanned_ffms.length; i++) {
			if(approval_pending_scanned_ffm_tr_tags == undefined)
				approval_pending_scanned_ffm_tr_tags = '';

			upload_pending_scanned_ffm_tr_tags += (
				'<tr>' + 
					'<td>' + upload_pending_scanned_ffms[i].igm_city + '</td>' +
					'<td>' + upload_pending_scanned_ffms[i].igm.igm_number + '</td>' +
					'<td>' + upload_pending_scanned_ffms[i].igm.flight_number + '</td>' +
					'<td>' + sails.config.custom.getReadableDate(upload_pending_scanned_ffms[i].igm.flight_date) + '</td>' +
					//'<td>' + upload_pending_scanned_ffms[i].igm.uploaded_by + '</td>' +
					'<td>' + sails.config.custom.getReadableDate(upload_pending_scanned_ffms[i].createdAt, true) + '</td>' +
				'</tr>'
			);
		}

		let approval_pending_scanned_ffm_html = undefined;
		if(approval_pending_scanned_ffm_tr_tags) {
			approval_pending_scanned_ffm_html = (
				'<table border="1">' + 
					'<thead>' + 
						'<th>IGM City</th>' + 
						'<th>IGM Number</th>' + 
						'<th>Flight Number</th>' + 
						'<th>Flight Date</th>' + 
						//'<th>Uploaded By</th>' + 
						'<th>Uploaded Date</th>' + 
					'</thead>' + 
					'<tbody>' + approval_pending_scanned_ffm_tr_tags + '</tbody>' + 
				'</table>'
			);
		}
	
		sails.helpers.sendEmail.with({
			to: cities[i].approval_manager_email,
			subject: '[' + cities[i].iata_code + '] Scanned Manifest - Pending upload / approvals report',
			html: (
				'<p>Upload of Scanned Manifest pending </p>' + 
				(upload_pending_scanned_ffm_html ? upload_pending_scanned_ffm_html : '<p>None</p>') + 
				'<p>Approval of Scanned Manifest pending </p>' + 
				(approval_pending_scanned_ffm_html ? approval_pending_scanned_ffm_html : '<p>None</p>')
			)
		}, function(err, status){
			if(err) {
				sails.log.error('CRON - Error while sending - sendEmailForDelayWithScannedFFM ');
				sails.log.error(err);
			} else {
				sails.log.info('CRON - sendEmailForDelayWithScannedFFM list is sent ');
			}
		});
	}
}
