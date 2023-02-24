/**
 * InvoiceController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
var wkhtmltopdf = require('wkhtmltopdf');
var QRCode = require('qrcode');
 
module.exports = {
	invoice: function(req, res) {
		if(req.query.invoice_id) {
			sails.config.globals.async.waterfall([
				function(callback) {
					Invoice.findOne({_id: req.query.invoice_id}, function(err, invoice) {
						if(err) {
							sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
							callback('failed to find the invoice', null, null, null, null, null);
						} else {
							if(invoice) {
								sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '1');
								callback(null, invoice);
							} else {
								callback('there is no invoice of the kind', null, null, null, null, null);
							}
						}
					});
				},
				function(invoice, callback) {
					/*var awb_user_data_objs = [];
					sails.config.globals.async.forEachOf(invoice.awbs, function(awb, irrelevant, cb){
						AwbUserData.findOne({awb_number: awb, void_on: 0}).exec(function(err, awb_user_data) {
							if(err) {
								console.log(err);
								return cb('Error in finding awb user datas');
							} else {
								if(awb_user_data) {
									awb_user_data_objs.push(awb_user_data);
									return cb(null);
								}
								else
									return cb('could not find the associated awb user data');
							}
						});
					}, function(err){
						if(err) {
							console.log('err occured ' + err);
							callback('Error in finding awb user datas', null, null, null, null);
						}
						else
							callback(null, invoice, awb_user_data_objs);
					});*/
					AwbUserData.find({_id: invoice.awb_user_datas}, function(err, awb_user_data_objs) {
						if(err) {
							sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
							callback('Error in finding awb user datas', null, null, null, null, null);
						} else {
							if(awb_user_data_objs.length > 0) {
								sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '2');
								callback(null, invoice, awb_user_data_objs);
							}
							else
								callback('could not find the associated awb user data', null, null, null, null, null);
						}
					})
				},
				function(invoice, awb_user_data_objs, callback) {
					CityConstants.findOne({
						and : [
							{ iata_code: awb_user_data_objs[0].igm_city},	//	Simple JUGAD
							{ expires_on: { '>': invoice.invoice_issue_date }},
							{ effective_from: { '<': invoice.invoice_issue_date }}
						]
					}, function(err, constants) {
						if (err) {
							sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
							callback('error finding city constants', null, null, null, null, null);
						} else {
							if(constants) {
								sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '3');
								callback(null, invoice, awb_user_data_objs, constants);
							} else {
								callback('could not find city constants', null, null, null, null, null);
							}
						}
					});
				},
				function(invoice, awb_user_data_objs, constants, callback) {
					var awbs = [];
					for(var i = 0; i < awb_user_data_objs.length; i++)
						awbs.push(awb_user_data_objs[i].awb_number);

					PartAwb.find({awb_number: awbs, void_on: 0, part_awb_include_for_invoice: true}, function(err, part_awbs) {
						if(err) {
							sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
							callback('Error in finding PartAWBs', null, null, null, null, null);
						} else {
							if(part_awbs.length > 0) {
								sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '4');
								callback(null, invoice, awb_user_data_objs, constants, part_awbs);
							} else {
								callback('Found 0 PartAWBs', null, null, null, null, null);
							}
						}
					});
				},
				function(invoice, awb_user_data_objs, constants, part_awbs, callback) {
					if(invoice.dcms) {
						DCM.find({_id: invoice.dcms}, function(err, dcms) {
							if(err) {
								sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
								callback('Error in finding DCM during showing invoice', null, null, null, null, null);
							} else {
								sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '5');
								callback(null, invoice, awb_user_data_objs, constants, part_awbs, dcms);
							}
						});
					} else {
						sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '6');
						callback(null, invoice, awb_user_data_objs, constants, part_awbs, null);
					}
				},
				async function(invoice, awb_user_data_objs, constants, part_awbs, dcms, callback) {
					let qrcode;
					let irn = await IRN.findOne({invoice_number: invoice.invoice_number, type_of_invoice: sails.config.custom.irn_invoice_types.invoice, status: sails.config.custom.irn_job_status.done});

					//	We want that the QR code is generated for all the B2C customers.
					if(true || sails.config.custom.e_invoice_supported) {
						if(awb_user_data_objs[0].consignee_gstn) {
							if(irn && irn.qrcode) {
								qrcode = await QRCode.toDataURL(irn.qrcode);
							}
						} else {
							let upi_address;
							switch(constants.iata_code) {
								case 'BLR': {upi_address ='bablrcargo@citibank'} break;
								case 'BOM': {upi_address ='babomcargo@citibank'} break;
								case 'DEL': {upi_address ='badelcargo@citibank'} break;
								case 'HYD': {upi_address ='bahydcargo@citibank'} break;
								case 'MAA': {upi_address ='bamaacargo@citibank'} break;
							}
							qrcode = await QRCode.toDataURL("upi://pay?cu=INR&pa=" + upi_address + "&pn=" + sails.config.globals.airlines_name + "&am=" + Math.ceil(invoice.amount_billed));
						}
					}

					callback(null, invoice, awb_user_data_objs, constants, part_awbs, dcms, qrcode, irn ? irn.irn : undefined, irn ? irn.ack_no : undefined, irn ? irn.ack_date : undefined);
				}
			], function(err, invoice, awb_user_data_objs, constants, part_awbs, dcms, qrcode, irn, ack_no, ack_date) {
				if(err) {
					sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + err);
					res.view('pages/imlost', {error: err});
				} else {
					if(invoice) {
						//if(awb_user_data_objs.length === 1)
							res.view('pages/invoice',  {print: req.query.print, invoice: invoice, awb_user_data_objs: awb_user_data_objs, constants: constants, part_awbs: part_awbs, dcms: dcms, qrcode: qrcode, irn: irn, ack_no: ack_no, ack_date: ack_date});
						//else
							//res.view('pages/invoice2', {invoice: invoice, awb_user_data_objs: awb_user_data_objs, constants: constants, part_awbs: part_awbs});
					} else {
						sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '6');
						res.view('pages/imlost', {error: 'unable to display the invoice'});
					}
				}
			});
		} else {
			sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (invoice - get)' + 'invoice information is not received');
			res.view('pages/imlost', {error: 'invoice information is not received'});
		}
	},
	issueinvoice: function(req, res) {

		if(req.body.awb_number) {

			AwbUserData.findOne({awb_number: req.body.awb_number, void_on: 0}, function(err, awb_user_data) {
				if(err){
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issueinvoice - post)' + err);
					res.send({error: 'error in finding the AWB user Data'});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
					if(awb_user_data && !awb_user_data.invoice_document) {
						sails.helpers.issueInvoice.with({
							awb_user_datas: [awb_user_data],
							dcms: null,
							generated_by: req.user.username
						}).exec(function(err, invoice) {
							if(invoice.error) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
								res.send(invoice);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
								res.send(invoice);
							}
						});
					}
					else {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issueinvoice - post)' + 'could not find awb user data for invoicing');
						res.send({error: 'could not find awb user data for invoicing'});
					}
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issueinvoice - post)' + 'No AWB number received');
			res.send({error: 'No AWB number received'});
		}
	},
	generateinvoicedo: function(req, res) {
		var awbuserdatas_ids = req.body.inward_cargo_awbuserdatas_ids;
		if(awbuserdatas_ids && req.body.inwardcargo_consignees_list_consignee) {
			sails.config.globals.async.series({
				awb_user_datas: function(callback){
					AwbUserData.find({_id: awbuserdatas_ids}, function(err, awb_user_datas) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateinvoicedo - post)' + err);
							callback('error in finding the AWB user Datas', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
							if(awb_user_datas.length > 0) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
								callback(null, awb_user_datas);
							} else {
								callback('could not find any AWBUserData for invoicing', null);
							}
						}
					});
				},
				dcms: function(callback) {
					if(req.body.inwardcargo_consignees_list_consignee) {
						DCM.find({consignee: req.body.inwardcargo_consignees_list_consignee, invoiced_under_invoice_id: ''}, function(err, dcms){
							if(err) {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateinvoicedo - post)' + err);
								callback('error in finding the DCMs for this customer', null);
							} else {
								//if(dcms.length > 0) {
									sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
									callback(null, dcms);
								//}
							}
						});
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
						callback(null, []);	//	Even if there are no DCMs we still want to proceed.
					}
				}
			}, function(err, results) {
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateinvoicedo - post)' + err);
					res.send(err);
				} else {
					if(results && results.awb_user_datas.length > 0) {
						var credit_period_from = 0;
						var credit_period_to = 0;
						for(var i = 0; i < results.awb_user_datas.length; i++) {
							var created_at = results.awb_user_datas[i].createdAt;

							//	We want that the smallest created date be the credit_from and largest created date be credit_to
							if(credit_period_from === 0 || credit_period_from > created_at)
								credit_period_from = created_at;
							if(credit_period_to === 0 || credit_period_to < created_at)
								credit_period_to = created_at;
						}
						sails.helpers.issueInvoice.with({
							awb_user_datas: results.awb_user_datas,
							dcms: results.dcms,
							credit_period_to: credit_period_to,
							credit_period_from: credit_period_from,
							generated_by: req.user.username
						}).exec(function(err, invoice) {
							if(invoice.error) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
								res.send(invoice);	//	We are sending the error that is sent in the object called invoice.
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
								//res.redirect('/invoice?invoice_id=' + invoice.id);
								res.send({result: invoice.id});
							}
						});
					}
					else {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateinvoicedo - post)' + 'could not find any AWBUserData for invoicing');
						res.send({error: 'could not find any AWBUserData for invoicing'});
					}
				}
			});
			/*AwbUserData.find({_id: awbuserdatas_ids}, function(err, awb_user_datas) {
				if(err) {
					res.send({error:err});
				} else {
					console.log(awb_user_datas);
					if(awb_user_datas.length > 0) {
						sails.helpers.issueInvoice.with({
							awb_user_datas: awb_user_datas
						}).exec(function(err, invoice) {
							if(invoice.error) {
								res.send(invoice);
							} else {
								res.redirect('/invoice?invoice_id=' + invoice.id);
							}
						});
					}
				}
			});*/
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateinvoicedo - post)' + 'AWBs or Consignee are not selected');
			res.send({error:'AWBs or Consignee are not selected'});
		}
	},
	issuecreditinvoice: function(req, res) {
		//	Check if the consignee id is correct or incorrect
		//	If the consignee id is correct, then search for all the AWBUserData that have the consignee id as provided + the AWBUserData void_on = 0, and invoice_document = '' and do_document != ''
		//	These AWBUserData are the ones we want to push in the invoice

		if(req.query.consignee) {
			sails.config.globals.async.series({
				awb_user_datas: function(callback){
					AwbUserData.find({consignee: req.query.consignee, void_on: 0, invoice_document: '', do_document: {'!=':''}}, function(err, awb_user_datas) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issuecreditinvoice - get)' + err);
							callback('error in finding the AWB user Datas', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
							if(awb_user_datas.length > 0){
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
								callback(null, awb_user_datas);
							} else {
								callback('could not find any AWBUserData for invoicing', null);
							}
						}
					});
				},
				dcms: function(callback) {
					DCM.find({consignee: req.query.consignee, invoiced_under_invoice_id: ''}, function(err, dcms){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issuecreditinvoice - get)' + err);
							callback('error in finding the DCMs for this customer');
						}
						else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
							callback(null, dcms);
						}
					});
				}
			}, function(err, results) {
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issuecreditinvoice - get)' + err);
					res.send(err);
				} else {
					if(results && results.awb_user_datas.length > 0) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
						res.send(results);
						/*sails.helpers.issueInvoice.with({
							awb_user_datas: results.awb_user_datas,
							dcms: results.dcms
						}).exec(function(err, invoice) {
							if(invoice.error) {
								res.send(invoice);	//	We are sending the error that is sent in the object called invoice.
							} else {
								res.redirect('/invoice?invoice_id=' + invoice.id);
							}
						});*/
					}
					else {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issuecreditinvoice - get)' + 'could not find any AWBUserData for invoicing');
						res.send({error: 'could not find any AWBUserData for invoicing'});
					}
				}
			});

			////////////////

			/*AwbUserData.find({consignee: req.query.consignee, void_on: 0, invoice_document: '', do_document: {'!=':''}}, function(err, awb_user_datas) {
				if(err)
					res.send({error: 'error in finding the AWB user Datas'});
				else
					if(awb_user_datas.length > 0) {
						sails.helpers.issueInvoice.with({
							awb_user_datas: awb_user_datas
						}).exec(function(err, invoice) {
							if(invoice.error) {
								res.send(invoice);	//	We are sending the error that is sent in the object called invoice.
							} else {
								res.redirect('/invoice?invoice_id=' + invoice.id);
							}
						});
					}
					else {
						res.send({error: 'could not find any AWBUserData for invoicing'});
					}
			});*/
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (issuecreditinvoice - get)' + 'consignee cannot be blank');
			res.send({error: 'consignee cannot be blank'});
		}
	},
	voidinvoice: function(req, res) {
		if(req.body.invoice_id) {
			sails.config.globals.async.waterfall([
				async function(callback) {
					sails.log.error(req.user.username + ' - ' + new Date() +' (voidinvoice - post)' + 'Checking for an IRN for the invoice');
					let invoice = await Invoice.findOne({_id: req.body.invoice_id, void_on: 0});
					let invoice_irn = await IRN.findOne({invoice_number: invoice.invoice_number, type_of_invoice: sails.config.custom.irn_invoice_types.invoice, status: sails.config.custom.irn_job_status.done});

					//	If there is no IRN associated with any the invoice, then we need not try to cancel the IRN from the GST portal.
					if(sails.config.custom.e_invoice_supported && invoice_irn) {
						sails.log.error(req.user.username + ' - ' + new Date() +' (voidinvoice - post)' + ' IRN found for the invoice');
						let irn = await IRN.create({
							invoice_number: invoice.invoice_number,
							type_of_invoice: sails.config.custom.irn_invoice_types.cancel_invoice,
							status: sails.config.custom.irn_job_status.pending,
							irn: invoice_irn.irn
						}).fetch();

						console.log('irn', irn);
						let irn_response = await sails.helpers.eInvoice.with({id: irn.id});
						console.log('irn_response', irn_response);

						if(irn_response.success) {
							sails.log.error(req.user.username + ' - ' + new Date() +' (voidinvoice - post)' + 'Cancel IRN is successful');
							callback(null);
						} else {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post) Cancel IRN Error = ' + irn_response.error);
							callback(irn_response.error, null);
						}
					} else {
						sails.log.error(req.user.username + ' - ' + new Date() +' (voidinvoice - post)' + 'IRN not found');
						callback(null);
					}
				},
				function(callback) {
					Invoice.update({_id: req.body.invoice_id, void_on: 0}).set({void_on: Date.now(), void_reason: req.body.selected_reason, void_explanation: req.body.user_typed_reason}).fetch().exec(function(err, invoices){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post)' + err);
							callback('error while voiding the invoice', null);
						} else {
							if(invoices && invoices.length){
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
								callback(null, invoices[0]);
							} else {
								callback('there is no invoice to void', null);
							}
						}
					});
				},
				function(invoice, callback) {
					AwbUserData.update({awb_number: invoice.awb_number, void_on: 0, invoice_document: invoice.id}).set({invoice_document: ''}).fetch().exec(function(err, awb_user_data){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post)' + err);
							callback('error in updating the awb user data at voiding invoice');
						} else {
							if(awb_user_data) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
								callback(null, invoice);
							} else {
								callback('no awb user data was updated while voiding', null);
							}
						}
					});
				},
				function(invoice, callback) {
					if(invoice.dcms) {
						DCM.update({_id: invoice.dcms}).set({invoiced_under_invoice_id: ''}).fetch().exec(function(err,dcms) {
							if(err){
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post)' + err);
								callback('error in updating the DCM at voiding invoice');
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
								callback(null, invoice);
							}
						});
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
						callback(null, invoice);
					}
				}
			],function(err, final){
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post)' + err);
					res.send({error: err});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
					res.send({success: true});
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voidinvoice - post)' + 'no invoice id was received');
			res.send({error: 'no invoice id was received'});
		}

	},
	/*invoicepdf: function(req, res) {
		wkhtmltopdf.command = 'C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe';
		console.log(wkhtmltopdf);
		/*wkhtmltopdf('http://localhost:1337/invoice', { output: 'outdo.pdf' });
		//wkhtmltopdf('http://google.com/', {viewportSize :{ width: 1024, height: 600 }}).pipe(fs.createWriteStream('outinvo.pdf'));
		wkhtmltopdf('http://192.168.0.201:1337/invoice', {viewportSize: { width: 1024, height: 600 }, output: 'outinvo.pdf'}, function (err, stream) {
			  // do whatever with the stream
				res.send(stream);
			});
	},*/
	invoicepdf: function(req, res) {
		const phantom = require('phantom');
		//console.log();
		(async function() {
			const instance = await phantom.create();
			const page = await instance.createPage();

			await page.property('viewportSize', { width: 1024, height: 600 });
			const status = await page.open('http://192.168.43.246:1337/invoice');

			await page.render('invoice.pdf');
			await instance.exit();
		})();
	},
	getinvoicelist: function(req, res) {
		Ports.find({
		where: {
			and : [
				{ "is_inward_port" : true },
				{ iata_code: req.user.iata_code }
			]
		}, sort: 'iata_code'}, function(err, ports) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getinvoicelist - get)' + err);
				return res.view('pages/imlost', {error: 'Error while finding Ports during getting invoice list'});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
				return res.view('pages/invoicelist',{airportlistdetails: ports});
			}
		});
	},
	invoicelist: function(req, res) {
		var invoice_fromdate = Date.parse(req.body.inwardcargo_invoicelist_fromdate_input);
		var invoice_todate = Date.parse(req.body.inwardcargo_invoicelist_todate_input) + 1*24*60*60*1000;
		var invoice_city = req.body.inwardcargo_invoicelist_city_input;
		sails.config.globals.async.waterfall([
			function(callback){
				Invoice.find({
					where: {
						and : [
										{ invoice_issue_date: { '>=': invoice_fromdate }},
										{ invoice_issue_date: { '<=': invoice_todate }},
										{invoice_number: { endsWith: invoice_city }}
									]
								}, sort: 'invoice_issue_date'}
					, function(err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicelist - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if(invoices.length > 0) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
		function(invoices, callback){
			var awbuserdata_array = [];
			async.eachSeries(invoices, function(invoice, callback) {
				if( invoice ) {
					AwbUserData.find({
						//awb_number : invoice.awbs
						_id: invoice.awb_user_datas
					}, function(err, awbuserdatas) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicelist - post)' + err);
							callback('Awb Record not found');
						} else {
							if(awbuserdatas) {
								awbuserdata_array.push(awbuserdatas);
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
								callback();
							} else {
								callback('Awb Record not found');
							}
						}
					})
				} else {
					callback('Awb Record not found');
				}
			}, function(err) {
				// if any of the file processing produced an error, err would equal that error
				if( err ) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicelist - post)' + err);
				  callback(err, null, null, null);
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
					callback(null, invoices, awbuserdata_array);
				}
			});
		},
		function (invoices, awbuserdata_array, callback) {
			Ports.find({
			where: {
				and : [
					{ "is_inward_port" : true },
					{ iata_code: req.user.iata_code }
				]
			}, sort: 'iata_code'}, function(err, ports) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicelist - post)' + err);
					callback('something went wrong while finding airports', null, null, null);
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
					callback(null, ports, invoices, awbuserdata_array);
				}
			});
		},
		async function(ports, invoices, awbuserdata_array, callback) {
			let invoice_irn_list = [];
			if(sails.config.custom.e_invoice_supported) {
				for(let i = 0; i < invoices.length; i++) {
					let invoice_irn;
					if(invoices[i].void_on == 0) {
						invoice_irn = await IRN.findOne({
							invoice_number: invoices[i].invoice_number, 
							type_of_invoice: sails.config.custom.irn_invoice_types.invoice, 
							status: sails.config.custom.irn_job_status.done
						});
					}
					invoice_irn_list.push(invoice_irn);
				}
			}

			callback(null, ports, invoices, awbuserdata_array, invoice_irn_list);
		}
	], function(err, ports, invoices, awbuserdata_array, invoice_irn_list){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicelist - post)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
				return res.view('pages/invoicelist', {
					invoicelist : invoices, 
					awbuserdatalist: awbuserdata_array, 
					cityCode: invoice_city,
					airportlistdetails: ports,
					invoice_irn_list: invoice_irn_list
				});
			}
		});
	},
	invoicepaymetreceived: function(req, res) {
		var payment_amount = req.body.inwardcargo_invoice_payment_amount_input;
		var payment_comments = req.body.inwardcargo_invoice_payment_comment_input;
		var payment_mode = req.body.inwardcargo_invoice_payment_mode_input;
		var payment_reference_number = req.body.inwardcargo_invoice_payment_reference_number_input;
		var payment_drawn_on_text = req.body.inwardcargo_invoice_payment_drawn_on_input;
		var payment_instrument_dated_text = Date.parse(req.body.inwardcargo_invoice_payment_instrument_date_input);
		var invoice_id = req.body.inwardcargo_invoice_payment_invoice_id_input;
		var payment_received_date = Date.now();
		
		sails.config.globals.putinfolog(req.user.username, req.options.action, 'post invoicepaymetreceived', 
										' payment_amount = ' + payment_amount +
										', payment_comments = ' + payment_comments +
										', payment_mode = ' + payment_mode +
										', payment_reference_number = ' + payment_reference_number +
										', payment_drawn_on_text = ' + payment_drawn_on_text +
										', payment_instrument_dated_text = ' + payment_instrument_dated_text +
										', invoice_id = ' + invoice_id +
										', payment_received_date = ' + payment_received_date
									);

		Invoice.update({_id: invoice_id, void_on: 0, payment_received_date: 0})
		.set({
			payment_received_date: payment_received_date,
			payment_amount: payment_amount,
			payment_comments: payment_comments,
			payment_mode: payment_mode,
			payment_reference_number: payment_reference_number,
			payment_drawn_on: payment_drawn_on_text,
			payment_instrument_date: payment_instrument_dated_text}).fetch().exec(function(err, invoice){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicepaymetreceived - post)' + err);
				return res.view('pages/imlost', {error: 'error in updating invoice'});
			} else {
				if(invoice) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
					return res.redirect('/invoice?invoice_id=' + invoice_id);
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (invoicepaymetreceived - post)' + 'updating invoice failed');
					res.send({error: 'updating invoice failed'});
				}
			}
		});
	},
	invoice2pdf: function(req, res) {
		const phantom = require('phantom');
		//console.log();
		(async function() {
			const instance = await phantom.create();
			const page = await instance.createPage();

			await page.property('viewportSize', { width: 1024, height: 600 });
			const status = await page.open('http://192.168.0.201:1337/invoice2');

			await page.render('invoice2.pdf');
			await instance.exit();
		})();
		res.attachment('/invoice2.pdf');
	},
	searchusinginvoiceno: function(req, res) {
		var invoice_number = req.body.inwardcargo_invoice_search_invoiceno_input;

		Invoice.findOne({invoice_number: invoice_number}, function(err, invoice) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (searchusinginvoiceno - post)' + err);
				res.send({error: 'Error occured while finding invoice'});
			} else {
				if(invoice) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
					res.send({value: invoice.id});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (searchusinginvoiceno - post)' + 'Unable to find the invoice');
					res.send({error: 'Unable to find the invoice'});
				}
			}
		});
	},
	regenerateinvoice: async function(req, res) {
		let invoice_id = req.params.id;
		let invoice = await Invoice.findOne({id: invoice_id});
		if(invoice) {
			if(invoice.dcm_document) {
				await Invoice.update({id: invoice_id}).set({void_by: req.user.username, void_reason: 'regenerating the invoice'});
				let awb_user_datas = await AwbUserData.find({id: invoice.awb_user_datas});
				let new_invoice = await sails.helpers.issueInvoice.with({
					awb_user_datas: awb_user_datas,
					//dcms: results.dcms,
					credit_period_to: invoice.credit_period_to,
					credit_period_from: invoice.credit_period_from,
					generated_by: req.user.username
				});
				if(new_invoice) {
					await Invoice.update({id: new_invoice.id}).set({
						payment_received_date: invoice.payment_received_date,
						payment_amount: invoice.payment_amount,
						payment_mode: invoice.payment_mode,
						payment_reference_number: invoice.payment_reference_number,
						payment_drawn_on: invoice.payment_drawn_on,
						payment_instrument_date: invoice.payment_instrument_date,
						payment_comments: invoice.payment_comments,
					});
					return res.redirect(sails.config.custom.base_url + '/invoice?invoice_id=' + new_invoice.id);
				} else {
					return res.send('failed to generate new invoice');
				}
			} else {
				return res.send('There is no DCM raised on this invoice, so we cannot regenerate the invoice while its an active invoice.');
			}
		} else {
			res.send('No Such Invoice');
		}
	}
};
