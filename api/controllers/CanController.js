/**
 * CanController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

var wkhtmltopdf = require('wkhtmltopdf');
const os = require('os');

module.exports = {
	//	part_awb - part awb id
	createcan: function(req, res) {
		var first_can_issued = false;
		if(req.body.part_awb == undefined) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + 'The Part AWB does not exist (invalid query)');
			return res.send({error: 'The Part AWB does not exist (invalid query)'});
		}

		//	Identify AWB object
		//	Identify if CAN is issued on the AWB, if not then we can decide that this CAN is to be issued with charges
		//	Create CAN object

		var now_date = Date.now();	//	Calculating it only once so that at 12 midnight, there should be no conflict. This also adds consistency

		sails.config.globals.async.waterfall([
			function(callback) {
				Can.findOne({part_awb: req.body.part_awb, void_on: 0/*, awb_number: req.body.awb_number*/}, function(err, can) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						callback('Error occured while finding CAN', null);
					} else {
						if(can) {
							callback('Reissue of CAN is not possible', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
							callback();
						}
					}
				});
			},
			function(callback) {
				Can.find({awb_number: req.body.awb_number, void_on: 0}, function(err, cans){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						callback('Error in searching CANs', null);
					} else {
						var apply_charges = true;
						for(var i = 0; i < cans.length; i++)
							if(cans[i].can_issued_with_charges) {
								apply_charges = false;
								break;
							}
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
						callback(null, apply_charges);
					}
				});
			},
			function(apply_charges, callback) {
				AwbUserData.findOne({awb_number: req.body.awb_number, void_on: 0}, function(err, awb_user_data){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						callback('failed to find AWBUserData', null);
					} else {
						if(awb_user_data) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
							callback(null, awb_user_data, apply_charges);
						} else {
							callback('Could not find AWBUserData', null);
						}
					}
				});
			},
			function(awb_user_data, apply_charges, callback) {
				PartAwb.findOne({_id: req.body.part_awb}, function(err, part_awb_data){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						callback('failed to find PartAwb', null);
					} else {
						if(part_awb_data) {
							first_can_issued = part_awb_data.first_can_issued;
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3.1');
							callback(null, awb_user_data, apply_charges);
						} else {
							callback('Could not find PartAwb', null);
						}
					}
				});
			},
			function(awb_user_data, apply_charges, callback) {
				Can.create({part_awb: req.body.part_awb, awb_number: req.body.awb_number, awb_user_data: awb_user_data.id, can_issue_date: now_date, can_issued_with_charges: apply_charges, issued_by: req.user.username}).fetch().exec(function(err, can){
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						console.log("error is "+err);
						callback('Error while creating the CAN', null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
						callback(null, awb_user_data, apply_charges, can);
					}
				});
			},
			function(awb_user_data, apply_charges, can, callback) {
				if(awb_user_data.consignee_email) {
					
					var filename = 'pdf/can_' + awb_user_data.awb_number + '.pdf';
					
					sails.helpers.printEmailPdf.with({
						url: 'http://localhost:1337/can?can=' + can.id,
						to_email_address: awb_user_data.consignee_email,
						email_subject: 'AWB - ' + awb_user_data.awb_number + ' - ' + (first_can_issued ? 'Revised ' : '') + 'Cargo Arrival Notice',
						email_html_body: '<div><p>Dear Sir/Madam,</p><p></p><p>This is to inform you that, your cargo having AWB number ' + awb_user_data.awb_number + ' has arrived. Please find the attached ' + (first_can_issued ? 'Revised ' : '') + 'Cargo Arrival Notice for your reference.</p><p>Disclaimer &ndash; The charges mentioned on the CAN copy are indicative and exact applicable charges will be payable at the point of document collection.</p><p></p><p>Regards,</p><p>' + sails.config.globals.airlines_name + '.</p><p><em>This is a system generated email, please do not reply to this email id.&nbsp; In case of any queries, kindly contact our local ' + sails.config.globals.airlines_name + ' office.</em></p></div>',
						filename: filename,
						wait_for_response: true,
					}).exec(function(err, response) {
						if(err || !response) {
							sails.log.error(' - ' + new Date() +' ERR - (createcan - post - on printEmailPdf)' + err);
						}
						console.log('print-response', response);
						callback(null, apply_charges, can, response.email_sent);
					});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '9');
					callback(null, apply_charges, can, false);
				}
			},
			function(apply_charges, can, can_email_sent, callback) {
				//	We need to set the value to true only if the initial value is false, once it is set true, it should always remain true after 1st CAN is issued
				if(first_can_issued === false) {
					first_can_issued = true;
				}
				PartAwb.update({_id: req.body.part_awb}).set({first_can_issued: first_can_issued, can_document: can.id, part_awb_include_for_invoice: apply_charges, can_email_sent: can_email_sent}).fetch().exec(function(err, updated_part_awb) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
						callback('Error finding part awb', null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '10');
						sails.helpers.performCanCheck.with({igm_no: updated_part_awb[0].igm_number}).exec(() => {});
						callback(null, can);
					}
				});
			}
		],function(err, can) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createcan - post)' + err);
				res.send({error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '11');
				res.send(can);
			}
		});
	},
	can: function(req, res) {
		if(req.query.can == undefined) {
			sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + 'The CAN does not exist (invalid query)');
			return res.send({error: 'The CAN does not exist (invalid query)'});
		}

		//var now_date = Date.now();	//	Calculating it only once so that at 12 midnight, there should be no conflict. This also adds consistency

		sails.config.globals.async.waterfall([
			function(callback) {
				Can.findOne({_id: req.query.can}, function(err, can) {
					if(err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('The Part AWB does not exist', null, null, null, null, null, null, null);
					} else {
						if(can) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '1');
							callback(null, can);
						} else {
							callback('could not find the CAN', null, null, null, null, null, null, null)
						}
					}
				});
			},
			function(can, callback) {
				PartAwb.findOne({_id: can.part_awb}, function(err, part_awb) {
					if(err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('Error Finding part awb', null, null, null, null, null, null, null);
					} else {
						if(part_awb) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '2');
							callback(null, can, part_awb);
						} else {
							callback('could not find part awb', null, null, null, null, null, null, null);
						}
					}
				});
			},
			function(can, part_awb, callback) {
				Igm.findOne({igm_number: part_awb.igm_number}, function(err, igm){
					if(err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('Error find the IGM', null, null, null, null, null, null, null);
					} else {
						if(igm) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '3');
							callback(null, can, part_awb, igm);
						} else {
							callback('could not find igm', null, null, null, null, null, null, null)
						}
					}
				});
			},
			function(can, part_awb, igm, callback) {
				AwbUserData.findOne({_id: can.awb_user_data}, function(err, awb_user_data){
					if(err){
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('error in finding awb', null, null, null, null, null, null, null);
					} else {
						if(awb_user_data) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '4');
							callback(null, can, part_awb, igm, awb_user_data);
						} else {
							callback('could not find awb', null, null, null, null, null, null, null);
						}
					}
				});
			},
			function(can, part_awb, igm, awb_user_data, callback) {
				CityConstants.findOne({
					and : [
						{ iata_code: part_awb.igm_city},
						{ expires_on: { '>': can.can_issue_date }},
						{ effective_from: { '<': can.can_issue_date }}
					]
				}, function(err, constants) {
					if (err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('error finding city constants', null, null, null, null, null, null, null);
					} else {
						if(constants) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '5');
							callback(null, can, part_awb, igm, awb_user_data, constants);
						} else {
							callback('could not find city constants', null, null, null, null, null, null, null);
						}
					}
				});
			},
			function(can, part_awb, igm, awb_user_datas, constants, callback){
				ExchangeRates.findOne({
					and : [
						{ currency: awb_user_datas.collect_currency_name},
						{ expires_on: { '>': can.can_issue_date }},
						{ effective_from: { '<': can.can_issue_date }}
					]
				}, function(err, collect_currency_exchangerate) {
					if (err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('error finding exchangerates at this point in time', null, null, null, null, null, null, null);
					} else {
						if(collect_currency_exchangerate) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '6');
							callback(null, can, part_awb, igm, awb_user_datas, constants, collect_currency_exchangerate);
						} else {
							callback('could not find exchangerate', null, null, null, null, null, null, null);
						}
					}
				});
			},
			function(can, part_awb, igm, awb_user_data, constants, collect_currency_exchangerate, callback){
				ExchangeRates.findOne({
					and : [
						{ currency: 'USD'},
						{ expires_on: { '>': can.can_issue_date }},
						{ effective_from: { '<': can.can_issue_date }}
					]
				}, function(err, usd_exchangerate) {
					if (err) {
						sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
						callback('error in finding usd exchangerates at this point in time', null, null, null, null, null, null, null);
					} else {
						if(usd_exchangerate) {
							sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '7');
							callback(null, can, part_awb, igm, awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate);
						} else {
							callback('could not find usd exchange', null, null, null, null, null, null, null);
						}
					}
				});
			},
			function(can, part_awb, igm, awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate, callback) {
				sails.helpers.awbCalculations.with({
					awb_user_data: awb_user_data,
					constants: constants,
					collect_currency_exchangerate: collect_currency_exchangerate,
					usd_exchangerate: usd_exchangerate
				}).exec(function(err, awb_user_data_updated) {
					sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '8');
					callback(null, can, part_awb, igm, awb_user_data_updated, constants, collect_currency_exchangerate, usd_exchangerate);
				});
			}
		], function(err, can, part_awb, igm, awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate) {
			if(err) {
				sails.log.error(((req.user && req.user.username) ? req.user.username : 'printing') + ' - ' + new Date() +' ERR - (can - get)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				if(constants.can_front && constants.can_back) {
					var QuillDeltaToHtmlConverter = require('quill-delta-to-html');
					var can_front_obj = {};
					var can_front_converter = new QuillDeltaToHtmlConverter(constants.can_front.ops, can_front_obj);
					constants.can_front = can_front_converter.convert();
					var can_back_obj = {};
					var can_back_converter = new QuillDeltaToHtmlConverter(constants.can_back.ops, can_back_obj);
					constants.can_back = can_back_converter.convert();
				}
				sails.config.globals.putinfolog((req.user && req.user.username) ? req.user.username : 'printing', req.options.action, 'get', '9');
				return res.view('pages/can', {can: can, part_awb: part_awb, igm: igm, awb_user_data: awb_user_data, constants: constants, collect_currency_exchangerate: collect_currency_exchangerate, usd_exchangerate: usd_exchangerate});
			}
		});
	},
	estimatedocost: function(req, res) {
		if(req.body.awb_user_data == undefined) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + 'Cannot estimate value for this AWB');
			return res.send({error: 'Cannot estimate value for this AWB'});
		}

		var now_date = Date.now();	//	Calculating it only once so that at 12 midnight, there should be no conflict. This also adds consistency

		sails.config.globals.async.waterfall([
			function(callback) {
				AwbUserData.findOne({_id: req.body.awb_user_data}, function(err, awb_user_data){
					if(err){
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + err);
						callback('error in finding awb in estimatedocost', null);
					} else {
						if(awb_user_data) {
							if(awb_user_data.rate_reference_date > 0) {
								now_date = awb_user_data.rate_reference_date;
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
							}
							callback(null, awb_user_data);
						}
						else {
							callback('could not find awb while estimatedocost', null);
						}
					}
				});
			},
			function(awb_user_data, callback) {
				CityConstants.findOne({
					and : [
						{ iata_code: req.body.igm_city},
						{ expires_on: { '>': now_date }},
						{ effective_from: { '<': now_date }}
					]
				}, function(err, constants) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + err);
						callback('error finding city constants in estimatedocost', null);
					} else {
						if(constants) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
							callback(null, awb_user_data, constants);
						} else {
							callback('could not find city constants in estimatedocost', null);
						}
					}
				});
			},
			function(awb_user_datas, constants, callback){
				ExchangeRates.findOne({
					and : [
						{ currency: awb_user_datas.collect_currency_name},
						{ expires_on: { '>': now_date }},
						{ effective_from: { '<': now_date }}
					]
				}, function(err, collect_currency_exchangerate) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + err);
						callback('error finding exchangerates at this point in time in estimatedocost', null);
					} else {
						if(collect_currency_exchangerate) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
							callback(null, awb_user_datas, constants, collect_currency_exchangerate);
						} else {
							callback('could not find exchangerate in estimatedocost', null);
						}
					}
				});
			},
			function(awb_user_data, constants, collect_currency_exchangerate, callback){
				ExchangeRates.findOne({
					and : [
						{ currency: 'USD'},
						{ expires_on: { '>': now_date }},
						{ effective_from: { '<': now_date }}
					]
				}, function(err, usd_exchangerate) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + err);
						callback('error in finding usd exchangerates at this point in time', null);
					} else {
						if(usd_exchangerate) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
							callback(null, awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate);
						} else {
							callback('could not find usd exchange', null);
						}
					}
				});
			},
			function(awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate, callback) {
				sails.helpers.awbCalculations.with({
					awb_user_data: awb_user_data,
					constants: constants,
					collect_currency_exchangerate: collect_currency_exchangerate,
					usd_exchangerate: usd_exchangerate
				}).exec(function(err, awb_user_data_updated) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
					callback(null, awb_user_data_updated);
				});
			}
		], function(err, awb_user_data) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (estimatedocost - post)' + err);
				return res.send({error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
				return res.send({value: '' + sails.config.globals.price_formatter(Math.ceil(awb_user_data.do_charge + awb_user_data.break_bulk_charge + awb_user_data.baggage_charge + awb_user_data.cartage_charge + awb_user_data.collect_charge + awb_user_data.collect_fee + awb_user_data.misc_charges + awb_user_data.igst + awb_user_data.sgst + awb_user_data.cgst + awb_user_data.direct_delivery_charge))});
			}
		});
	},
	canpdf: function(req, res) {
		wkhtmltopdf.command = sails.config.globals.win32_wkhtmltopdf_path;
		wkhtmltopdf('http://localhost:1337/can?can=5b939c61a8253e1bec0f9816', { pageSize: 'A4', output: 'outcan.pdf' , debugJavascript: true, debugStdOut: true}, function(err, stream) {
			if(err) {
				res.send('error');
			} else {
				res.send('outcan.pdf');
			}
		});
		/*const phantom = require('phantom');
		(async function() {
			const instance = await phantom.create();
			const page = await instance.createPage();

			await page.property('viewportSize', { width: 595, height: 842 });
			//await page.property('paperSize', { format: 'A4', margin: '1cm' });
			const status = await page.open('http://localhost:1337/can?can=5b939c61a8253e1bec0f9816');
			console.log(`Page opened with status [${status}].`);

			await page.render('can.pdf');
			console.log(`File created at [./can.pdf]`);

			await instance.exit();
			res.send('done');
		})();*/
	}
};
