/**
 * DCMController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

var QRCode = require('qrcode');

module.exports = {
	getchqreq: function(req, res) {

		var invoice_id = req.query.invoice_id;
		var current_city = req.query.current_city;

		if(!invoice_id || !current_city) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + 'Cannot have invoice and/or city empty');
			res.send({error: 'Cannot have invoice and/or city empty'});
			return;
		}
		/*Invoice.findOne({_id: invoice_id}, function(err, invoice) {
			if (err) {
				callback('error finding invoices', null, null, null);
			} else {
				if(invoices.length > 0) {
					callback(null, invoices);
				} else {
					callback('No Invoices found', null, null, null);
				}
			}
		});*/
		sails.config.globals.async.waterfall([
			function(callback){
				Invoice.findOne({_id: invoice_id}, function(err, invoice) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + err);
						callback('error finding invoices', null, null, null, null);
					} else {
						if(invoice) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
							callback(null, invoice);
						} else {
							callback('No Invoices found', null, null, null, null);
						}
					}
				});
			},
		function(invoice, callback){
			AwbUserData.find({
				_id: invoice.awb_user_datas
			}, function(err, awbuserdatas) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + err);
					callback('Error finding Awb User Data', null, null, null, null);
				} else {
					if(awbuserdatas.length > 0) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
						callback(null, invoice, awbuserdatas);
					} else {
						callback('AwbUserData Records not found', null, null, null, null);
					}
				}
			});
		},function(invoice, awbuserdatas, callback){
			CityConstants.findOne({
				and : [
					{ iata_code: current_city},
					{ expires_on: { '>': Date.now() }},
					{ effective_from: { '<': Date.now() }}
				]
			}, function(err, constants) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + err);
					callback('error finding city constants', null, null, null, null);
				} else {
					if(constants) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
						callback(null, invoice, awbuserdatas, constants);
					} else {
						callback('could not find city constants', null, null, null, null);
					}
				}
			});
		},
		function(invoice, awbuserdatas, constants, callback) {
			if(invoice.chqreq_document) {
				ChequeRequest.findOne({_id: invoice.chqreq_document}, function(err, chqreq) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + err);
						callback('Error in finding ChequeRequest', null, null, null, null);
					} else {
						if(chqreq) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
							callback(null, invoice, awbuserdatas, constants, chqreq);
						} else {
							callback('Could not find ChequeRequest', null, null, null, null)
						}
					}
				});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
				callback(null, invoice, awbuserdatas, constants, undefined);
			}
		}
	], function(err,invoice, awbuserdatas, constants, chqreq){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getchqreq - get)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
				return res.view('pages/chqreq',{invoicedetails : invoice, awbuserdatas: awbuserdatas, constants: constants, current_city:current_city, chqreq: chqreq, user: req.user});
			}
		});
		/*var invoice_id = req.query.invoice_id;
		var current_city = req.query.current_city;
		Invoice.findOne({_id: invoice_id}, function(err, invoice) {
			if (err) {
				callback('error finding invoices', null, null, null, null);
			} else {
				if(invoice) {
					//callback(null, invoice);
					res.view('pages/chqreq', {invoice: invoice, user: req.user});
				} else {
					callback('No Invoices found', null, null, null, null);
				}
			}
		});*/
	},
	postchqreq: function(req, res) {
		var invoice_id = req.body.chqreq_invoice_id;
		var current_city = req.body.chqreq_city;
		var chqreq_do_amount_debit = Number(req.body.chqreq_do_amount_debit);
		var chqreq_do_amount_credit = Number(req.body.chqreq_do_amount_credit);
		var chqreq_cgst_debit = Number(req.body.chqreq_cgst_debit);
		var chqreq_cgst_credit = Number(req.body.chqreq_cgst_credit);
		var chqreq_sgst_debit = Number(req.body.chqreq_sgst_debit);
		var chqreq_sgst_credit = Number(req.body.chqreq_sgst_credit);
		var chqreq_igst_debit = Number(req.body.chqreq_igst_debit);
		var chqreq_igst_credit = Number(req.body.chqreq_igst_credit);

		if(
			invoice_id && current_city &&
			chqreq_do_amount_debit >= 0 &&
			chqreq_do_amount_credit >= 0 &&
			chqreq_cgst_debit >= 0 &&
			chqreq_cgst_credit >= 0 &&
			chqreq_sgst_debit >= 0 &&
			chqreq_sgst_credit >= 0 &&
			chqreq_igst_debit >= 0 &&
			chqreq_igst_credit >= 0) {

			var net_do_amount = chqreq_do_amount_credit - chqreq_do_amount_debit;
			var net_cgst = chqreq_cgst_credit - chqreq_cgst_debit;
			var net_sgst = chqreq_sgst_credit - chqreq_sgst_debit;
			var net_igst = chqreq_igst_credit - chqreq_igst_debit;

			var total = net_do_amount + net_cgst + net_sgst + net_igst;

			if(total === 0) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + 'The cheque will be issued for zero amount, hence not issuing');
				res.view('pages/imlost', {error: 'The cheque will be issued for zero amount, hence not issuing'});
				return;
			}

			sails.config.globals.async.waterfall([
				function(callback){
					Invoice.findOne({_id: invoice_id}, function(err, invoice) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
							callback('error finding invoices', null, null, null, null);
						} else {
							if(invoice) {
								if(invoice.chqreq_document) {
									callback('cannot issue another cheque to this invoice', null, null, null, null);
								} else {
									sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
									callback(null, invoice);
								}
							} else {
								callback('No Invoices found', null, null, null, null);
							}
						}
					});
				},
				function(invoice, callback){
					AwbUserData.find({
						_id: invoice.awb_user_datas
					}, function(err, awbuserdatas) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
							callback('Error finding Awb User Data', null, null, null, null);
						} else {
							if(awbuserdatas.length > 0) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
								callback(null, invoice, awbuserdatas);
							} else {
								callback('AwbUserData Records not found', null, null, null, null);
							}
						}
					});
				},
				function(invoice, awbuserdatas, callback) {
					var chqreq = {

						dcm_number: (total > 0 ? 'C' : 'D') + invoice.invoice_number,
						dcm_issue_date: Date.now(),
						base_invoice_id: invoice_id,
						consignee: awbuserdatas[0].consignee,	//	All this is good fix :P
						awb_user_datas: invoice.awb_user_datas,
						revised_amount: total,
						do_amount: net_do_amount,
						igst: net_igst,
						sgst: net_sgst,
						cgst: net_cgst,

						generated_by: req.user.username
					}

					ChequeRequest.create(chqreq).fetch().exec(function(err, chqreq){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
							callback('Error in creating cheque request', null, null, null, null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
							callback(null, invoice, awbuserdatas, chqreq);
						}
					});
				},
				function(invoice, awbuserdatas, chqreq, callback) {
					Invoice.update({_id: invoice.id}).set({chqreq_document: chqreq.id}).fetch().exec(function(err, inv){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
							callback('Error in updating the invoice post chq req', null, null, null, null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
							callback(null, inv, awbuserdatas, chqreq);
						}
					});
				},function(inv, awbuserdatas, chqreq, callback){
					CityConstants.findOne({
						and : [
							{ iata_code: current_city},
							{ expires_on: { '>': Date.now() }},
							{ effective_from: { '<': Date.now() }}
						]
					}, function(err, constants) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
							callback('error finding city constants', null, null, null, null);
						} else {
							if(constants) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
								callback(null, inv, awbuserdatas, chqreq, constants);
							} else {
								callback('could not find city constants', null, null, null, null);
							}
						}
					});
				},function(inv, awbuserdatas, chqreq, constants, callback){
					if(constants && constants.approver_email) {
						sails.helpers.sendEmail.with({
							to: constants.approver_email,
							subject: 'IMPORT/CHEQUE REQUEST - ' + chqreq.dcm_number,
							html: '<div><p>Dear Sir,</p><p>Request your approval for attached cheque request of INR ' + total + ', raised against invoice no ' + chqreq.base_invoice_id + '.</p><p>Regards,</p><p>' + current_city + ' Imports.</p><p>' + sails.config.globals.airlines_name + '.</p><p><i>This is a system generated email, please do not reply to this email id.</i></p></div>'
						}).exec(function(err, sent_status) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
							callback(null, inv, awbuserdatas, chqreq, constants);
						});
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '7');
						callback(null, inv, awbuserdatas, chqreq, constants);
					}
				}
			], function(err, inv, awbuserdatas, chqreq, constants){
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + err);
					return res.view('pages/imlost', {error: err});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '8');
					res.redirect('/chqreq?invoice_id='+chqreq.base_invoice_id+'&current_city='+current_city);
					//res.view('pages/chqreq',{invoicedetails : inv, awbuserdatas: awbuserdatas, /*constants: constants,*/ current_city:current_city, chqreq: chqreq, user: req.user});
				}
			});

		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (postchqreq - post)' + 'cheque request cannot be processed due to error in entered values');
			res.send({error: 'cheque request cannot be processed due to error in entered values'})
		}
	},
	dcm: function(req, res) {
		var invoice_id = req.query.invoice_id;
		var current_city = req.query.current_city;

		if(!invoice_id || !current_city) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + 'Cannot have invoice and/or city empty');
			res.send({error: 'Cannot have invoice and/or city empty'});
			return;
		}
		/*Invoice.findOne({_id: invoice_id}, function(err, invoice) {
			if (err) {
				callback('error finding invoices', null, null, null);
			} else {
				if(invoices.length > 0) {
					callback(null, invoices);
				} else {
					callback('No Invoices found', null, null, null);
				}
			}
		});*/
		sails.config.globals.async.waterfall([
			function(callback){
				Invoice.findOne({_id: invoice_id}, function(err, invoice) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + err);
						callback('error finding invoices', null, null, null, null, null, null);
					} else {
						if(invoice) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
							callback(null, invoice);
						} else {
							callback('No Invoices found', null, null, null, null, null, null);
						}
					}
				});
			},
		function(invoice, callback){
			AwbUserData.find({
				_id: invoice.awb_user_datas
			}, function(err, awbuserdatas) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + err);
					callback('Error finding Awb User Data', null, null, null, null, null, null);
				} else {
					if(awbuserdatas.length > 0) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
						callback(null, invoice, awbuserdatas);
					} else {
						callback('AwbUserData Records not found', null, null, null, null, null, null);
					}
				}
			});
		},function(invoice, awbuserdatas, callback){
			CityConstants.findOne({
				and : [
					{ iata_code: current_city},
					{ expires_on: { '>': Date.now() }},
					{ effective_from: { '<': Date.now() }}
				]
			}, function(err, constants) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + err);
					callback('error finding city constants', null, null, null, null, null, null);
				} else {
					if(constants) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
						callback(null, invoice, awbuserdatas, constants);
					} else {
						callback('could not find city constants', null, null, null, null, null, null);
					}
				}
			});
		},
		function(invoice, awbuserdatas, constants, callback) {
			if(invoice.dcm_document) {
				DCM.findOne({_id: invoice.dcm_document}, function(err, dcm) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + err);
						callback('Error in finding DCM', null, null, null, null, null, null);
					} else {
						if(dcm) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
							callback(null, invoice, awbuserdatas, constants, dcm);
						} else{
						callback('Could not find DCM', null, null, null, null, null, null);
						}
					}
				});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
				callback(null, invoice, awbuserdatas, constants, undefined);
			}
		},
		async function(invoice, awbuserdatas, constants, dcm, callback) {
			if(dcm) {
				let irn = await IRN.findOne({invoice_number: dcm.dcm_number, type_of_invoice: sails.config.custom.irn_invoice_types.dcm, status: sails.config.custom.irn_job_status.done});

				let qrcode;
				if(irn)
					qrcode = await QRCode.toDataURL(irn.qrcode);

				callback(null, invoice, awbuserdatas, constants, dcm, irn, qrcode);
			} else {
				callback(null, invoice, awbuserdatas, constants, undefined, null, null);
			}
		}
	], function(err,invoice, awbuserdatas, constants, dcm, irn, qrcode){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcm - get)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
				return res.view('pages/dcm',{invoicedetails : invoice, awbuserdatas: awbuserdatas, constants: constants, current_city:current_city, dcm: dcm, irn: irn, qrcode: qrcode});
			}
		});
	},
	dcmgenerate: function(req, res) {

		var dcm_reason = req.body.dcm_reason;
		var dcm_each_awb_total = req.body.dcm_each_awb_total
		var awb_user_data_ids = req.body.dcm_awb_user_data_id;
		var revised_or_correct_details = req.body.dcm_revised_or_correct_details;

		var dcm_incorrect_igst = req.body.dcm_incorrect_igst === undefined ? 0 : Number(req.body.dcm_incorrect_igst);
		var dcm_incorrect_cgst = req.body.dcm_incorrect_cgst === undefined ? 0 : Number(req.body.dcm_incorrect_cgst);
		var dcm_incorrect_sgst = req.body.dcm_incorrect_sgst === undefined ? 0 : Number(req.body.dcm_incorrect_sgst);
		var dcm_incorrect_other_charges = req.body.dcm_incorrect_other_charges === undefined ? 0 : Number(req.body.dcm_incorrect_other_charges);

		var dcm_correct_igst = Number(req.body.dcm_correct_igst);
		var dcm_correct_cgst = Number(req.body.dcm_correct_cgst);
		var dcm_correct_sgst = Number(req.body.dcm_correct_sgst);
		var dcm_correct_other_charges = Number(req.body.dcm_correct_other_charges);

		var invoice_id = req.body.dcm_invoice_id;
		var invoice_number = req.body.dcm_invoice_number;
		var current_city = req.body.dcm_current_city;
		var dcm_consignee = req.body.dcm_consignee;

		var dcm_incorrect_total = 0;//Number(req.body.dcm_incorrect_total);
		var dcm_correct_total = 0;

		var array_of_incorrect_values = [];
		var array_of_correct_amount = [];
		var array_of_awb_user_data_ids = [];

		for(var i = 0; i < revised_or_correct_details.length; i++) {
			if(revised_or_correct_details[i]) {
				array_of_correct_amount.push(Number(revised_or_correct_details[i]));
				array_of_incorrect_values.push(Number(dcm_each_awb_total[i]));
				array_of_awb_user_data_ids.push(awb_user_data_ids[i]);
				dcm_incorrect_total += Number(dcm_each_awb_total[i]);
				dcm_correct_total += Number(revised_or_correct_details[i]);
			}
		}

		dcm_incorrect_total += dcm_incorrect_igst;
		dcm_incorrect_total += dcm_incorrect_cgst;
		dcm_incorrect_total += dcm_incorrect_sgst;
		dcm_incorrect_total += dcm_incorrect_other_charges;

		dcm_correct_total += dcm_correct_igst ? dcm_correct_igst : 0;
		dcm_correct_total += dcm_correct_cgst ? dcm_correct_cgst : 0;
		dcm_correct_total += dcm_correct_sgst ? dcm_correct_sgst : 0;
		dcm_correct_total += dcm_correct_other_charges ? dcm_correct_other_charges : 0;

		var revised_total = dcm_correct_total - dcm_incorrect_total;

		if(Math.round(dcm_incorrect_total - dcm_correct_total) === 0) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + 'The corrected values and the incorrect values sums up to same value. No need for DCM to be issued');
			return res.send({error: 'The corrected values and the incorrect values sums up to same value. No need for DCM to be issued'});
		}

		if((array_of_correct_amount.length <= 0 || array_of_awb_user_data_ids.length <= 0) && dcm_correct_other_charges == 0) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + 'There are no Corrected/Revised values submitted.');
			return res.send({error: 'There are no Corrected/Revised values submitted.'});
		}

		sails.config.globals.async.waterfall([
			function(callback) {
				DCM.create({
					dcm_number: (revised_total < 0 ? 'C' : 'D') + invoice_number,
					dcm_issue_date: Date.now(),
					base_invoice_id: invoice_id,
					consignee: dcm_consignee,
					revised_total: revised_total,
					dcm_reason: dcm_reason,

					igst: dcm_correct_igst,
					sgst: dcm_correct_sgst,
					cgst: dcm_correct_cgst,
					other_charges: dcm_correct_other_charges,

					incorrect_igst: dcm_incorrect_igst,
					incorrect_sgst: dcm_incorrect_sgst,
					incorrect_cgst: dcm_incorrect_cgst,
					incorrect_other_charges: dcm_incorrect_other_charges,

					awb_user_datas: array_of_awb_user_data_ids,
					correct_amount: array_of_correct_amount,
					incorrect_amount: array_of_incorrect_values,
					generated_by: req.user.username
				}).fetch().exec(function(err, dcm){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + err);
						callback('Error while creating the DCM', null, null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
						callback(null, dcm);
					}
				});
			},
			function(dcm, callback) {
				Invoice.update({_id: dcm.base_invoice_id},{dcm_document: dcm.id}).fetch().exec(function(err, invoice){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + err);
						callback('Error in updating invoice for DCM', null, null);
					} else {
						if(invoice) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
							callback(null, dcm);
						} else {
							callback('Could not update any invoice', null, null);
						}
					}
				});
			},function(dcm, callback){
				CityConstants.findOne({
					and : [
						{ iata_code: current_city},
						{ expires_on: { '>': Date.now() }},
						{ effective_from: { '<': Date.now() }}
					]
				}, function(err, constants) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + err);
						callback('error finding city constants', null, null);
					} else {
						if(constants) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
							callback(null, dcm, constants);
						} else {
							callback('could not find city constants', null, null);
						}
					}
				});
			},function(dcm, constants, callback){
				if(constants && constants.intimation_email) {
					sails.helpers.sendEmail.with({
						to: constants.intimation_email,
						subject: 'IMPORT/DCM  - ' + dcm.dcm_number,
						html: '<div><p>Dear Sir,</p><p>Request your approval for Debit or Credit No ' + dcm.dcm_number + ' Amount INR ' + revised_total + ', raised against Invoice No. ' + invoice_number + '.</p><p>Regards,</p><p>' + current_city + ' Imports.</p><p>' + sails.config.globals.airlines_name + '.</p><p><i>This is a system generated email, please do not reply to this email id.</i></p></div>'
					}).exec(function(err, sent_status) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
						callback(null, dcm, constants);
					});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
					callback(null, dcm, constants);
				}
			},
			async function(dcm, constants, callback) {
				
				sails.log.error(req.user.username + ' - ' + new Date() +' (voidinvoice - post)' + 'Checking for an IRN for the invoice');
				let invoice = await Invoice.findOne({_id: dcm.base_invoice_id, void_on: 0});
				let invoice_irn = await IRN.findOne({invoice_number: invoice.invoice_number, type_of_invoice: sails.config.custom.irn_invoice_types.invoice, status: sails.config.custom.irn_job_status.done});

				if(sails.config.custom.e_invoice_supported && invoice_irn) {
					let irn = await IRN.create({
						invoice_number: dcm.dcm_number,
						type_of_invoice: sails.config.custom.irn_invoice_types.dcm,
						status: sails.config.custom.irn_job_status.pending
					}).fetch();

					let irn_response = await sails.helpers.eInvoice.with({id: irn.id});
					console.log('irn_response', irn_response);
					
					if(irn_response.success) {
						callback(null, dcm, constants);
					} else {
						callback(irn_response.error, null, null);
					}
				} else {
					callback(null, dcm, constants);
				}
			}
		], function(err, dcm, constants) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dcmgenerate - post)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
				res.redirect('/dcm?invoice_id='+invoice_id+'&current_city='+current_city);
			}
		});
	}
};
