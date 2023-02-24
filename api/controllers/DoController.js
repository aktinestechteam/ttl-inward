/**
* DoController
*
* @description :: Server-side actions for handling incoming requests.
* @help        :: See https://sailsjs.com/docs/concepts/actions
*/

var wkhtmltopdf = require('wkhtmltopdf');
module.exports = {
	dolist: function(req, res) {
		var selectedCity = req.query.inwardcargo_consignees_list_city;
		var selectedConsignee = req.query.inwardcargo_consignees_list_consignee;
		sails.config.globals.async.waterfall([
			function(callback) {
				Ports.find({
				where: {
					and : [
						{ "is_inward_port" : true },
						{ iata_code: req.user.iata_code }
					]
				}, sort: 'iata_code'}, function(err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
						callback('Something went wrong while finding airport', null, null, null, null);
					} else {
						if(ports.length > 0) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
							callback(null, ports);
						} else {
							callback('No Airports available to work with', null, null, null, null);
						}
					}
				});
			},
			function(ports, callback) {
				if(!selectedCity) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
					selectedCity = ports[0].iata_code;
				}
				Address.find({
					where: {
					and: [
						{city_iata_code: selectedCity},
						{ credit_period: { '!=': 'none' }}
					]
				}, sort: 'name'}, function(err, address) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
						callback('Something went wrong while finding consignee', null, null, null, null);
					} else {
						if(address.length > 0) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
							callback(null, address, ports);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
							callback(null, [], ports);
						}
					}
				});
			}, function(address, ports, callback){
				if((!selectedConsignee) && address.length > 0) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
					selectedConsignee = address[0].id;
				}
				if(selectedConsignee) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
					AwbUserData.find({consignee: selectedConsignee, void_on: 0, invoice_document: '', do_document: {'!=':''}}, function(err, awb_user_datas) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
							callback('error in finding the AWB user Datas', null, null, null, null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '7');
							if(awb_user_datas.length > 0) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '8');
								callback(null, awb_user_datas, address, ports);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '9');
								callback(null, [], address, ports);
								//callback('could not find any AWBUserData for invoicing', null, null);
							}
						}
					});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '10');
					callback(null, [], address, ports);
				}
			},function(awb_user_datas, address, ports, callback){
				var dolist = [];
				async.eachSeries(awb_user_datas, function(awbuserdata, callback) {
					Do.findOne({_id: awbuserdata.do_document}, function(err, do_documet) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
							callback('Error occured while finding DO');
						} else {
							if(do_documet) {
								dolist.push(do_documet);
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '11');
								callback();
							} else {
								callback('DO document not found for current awbuserdata');
							}
						}
					});
				}, function(err) {
				    if( err ) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
							callback(err, null, null, null, null);
				    } else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '12');
							callback(null, dolist, awb_user_datas, address, ports);
				    }
				});
			}
		], function(err, dolist, awb_user_datas, address, ports) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (dolist - get)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '13');
				return res.view('pages/generatecreditinvoice',{dolist: dolist, awbuserdatas: awb_user_datas, airportlistdetails: ports, consigneelist: address, selectedConsignee: selectedConsignee, selectedCity: selectedCity});
			}
		});
	},
	createdo: function(req, res) {
		if(req.body.part_awb && req.body.awb_number && req.body.igm_city) {
			var now_date = Date.now();	//	Calculating it only once so that at 12 midnight, there should be no conflict. This also adds consistency

			sails.config.globals.async.waterfall([
				function(callback) {
					//	Find a DO based on the part awb
					Do.findOne({part_awb: req.body.part_awb, void_on: 0}, function(err, DO) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('Error occured while finding DO', null);
						} else {
							if(DO) {
								callback('Reissue of DO is not possible', null);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
								callback();
							}
						}
					});
				},
				function(callback) {
					//	Find a DO based on the part awb
					AwbUserData.findOne({awb_number: req.body.awb_number, void_on: 0}, function(err, awb_user_data) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('Error occured while finding Awb User Data', null);
						} else {
							if(awb_user_data) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
								callback(null, awb_user_data);
							} else {
								callback('Could not find the awb user data', null);
							}
						}
					});
				},
				function(awb_user_data, callback) {
					sails.helpers.doInvoiceNumber.with({
						date: now_date,
						generate_number_for: 'DO',
						city: awb_user_data.igm_city,
						slash_between_month_year: false
					}).exec(function(err, number_sequence) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('error while getting sequence number', null);
						} else {
							if(number_sequence.error) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
								callback(number_sequence.error, null);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
								callback(null, awb_user_data, number_sequence.seq_number);
							}
						}
					});
				},
				//	If the DO is to be issued, create a DO
				function(/*do_include_for_invoice, */awb_user_data, seq_number, callback) {
					var do_number = seq_number + '/' + req.body.igm_city;
					Do.create({do_number: do_number, part_awb: req.body.part_awb, awb_number: req.body.awb_number, do_issue_date: now_date/*, do_include_for_invoice: do_include_for_invoice*/, awb_user_data: awb_user_data.id , issued_by: req.user.username}).fetch().exec(function(err, DO){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('Error while creating the DO', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
							callback(null, awb_user_data, DO/*, do_include_for_invoice*/);
						}
					});
				},
				function(awb_user_data, DO/*, do_include_for_invoice*/, callback) {
					PartAwb.update({_id: req.body.part_awb}).set({do_document: DO.id}).fetch().exec(function(err, updated_part_awb) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('Error finding part awb', null);
						} else {
							if(updated_part_awb && updated_part_awb.length > 0) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
								callback(null, awb_user_data, DO, updated_part_awb[0]);
							} else {
								callback('could not update the part awb during do issue', null);
							}
						}
					});
				},

				///////////////////////////////
				//	Perform waterfall separatedly only if the AWBUserData needs to be edited for this DO if it is marked for billing
				function(awb_user_data, DO, part_awb, callback) {
					if(part_awb.part_awb_include_for_invoice) {
						sails.config.globals.async.waterfall([
							//	Identify right Constants to be used
							function(callback) {
								var reference_date = awb_user_data.rate_reference_date === 0 ? DO.do_issue_date : awb_user_data.rate_reference_date;
								CityConstants.findOne({
									and : [
										{ iata_code: req.body.igm_city},
										{ expires_on: { '>': reference_date }},
										{ effective_from: { '<': reference_date }}
									]
								}, function(err, constants) {
									if (err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
										callback('error finding city constants', null);
									} else {
										if(constants) {
											sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '8');
											callback(null, awb_user_data, constants);
										} else {
											callback('could not find city constants', null);
										}
									}
								});
							},
							//	Identify right collect_currency_exchangerate
							function(awb_user_data, constants, callback) {
								var reference_date = awb_user_data.rate_reference_date === 0 ? DO.do_issue_date : awb_user_data.rate_reference_date;
								ExchangeRates.findOne({
									and : [
										{ currency: awb_user_data.collect_currency_name},
										{ expires_on: { '>': reference_date }},
										{ effective_from: { '<': reference_date }}
									]
								}, function(err, collect_currency_exchangerate) {
									if (err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
										callback('error finding exchangerates at this point in time', null);
									} else {
										if(collect_currency_exchangerate) {
											sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '9');
											callback(null, awb_user_data, constants, collect_currency_exchangerate);
										} else {
											callback('could not find exchangerate', null);
										}
									}
								});
							},
							//	Identify right usd_exchangerate
							function(awb_user_data, constants, collect_currency_exchangerate, callback) {
								var reference_date = awb_user_data.rate_reference_date === 0 ? DO.do_issue_date : awb_user_data.rate_reference_date;
								ExchangeRates.findOne({
									and : [
										{ currency: 'USD'},
										{ expires_on: { '>': reference_date }},
										{ effective_from: { '<': reference_date }}
									]
								}, function(err, usd_exchangerate) {
									if (err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
										callback('error in finding usd exchangerates at this point in time', null);
									} else {
										if(usd_exchangerate) {
											sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '10');
											callback(null, awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate);
										} else {
											callback('could not find usd exchange', null);
										}
									}
								});
							},
							//	Calculate the values for the invoice if the part awb is supposed to be invoiced
							function(awb_user_data, constants, collect_currency_exchangerate, usd_exchangerate, callback) {
								//	Calculating DO Charges
								sails.helpers.awbCalculations.with({
									awb_user_data: awb_user_data,
									constants: constants,
									collect_currency_exchangerate: collect_currency_exchangerate,
									usd_exchangerate: usd_exchangerate
								}).exec(function(err, awb_user_data_updated) {
									sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '11');
									callback(null, awb_user_data_updated);
								});
							},
							function(awb_user_data_updated, callback) {
								//	linking the created DO to the AWBUserData
								awb_user_data_updated.do_document = DO.id;

								//	If the rate_reference_date is not set, then set it.
								if(awb_user_data_updated.rate_reference_date === 0)
									awb_user_data_updated.rate_reference_date = now_date;

								AwbUserData.update({_id: awb_user_data_updated.id}).set(awb_user_data_updated).fetch().exec(function(err, result){
									if (err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
										callback('error in finding usd exchangerates at this point in time', null);
									} else {
										if(result && result.length > 0) {
											sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '12');
											callback(null, DO);
										} else {
											callback('could not update the awb user data', null);
										}
									}
								});
							}
						], function(err, DO) {
							if(err) {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
								callback(err, null);
							} else{
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '13');
								callback(null, DO);
							}
						});
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '14');
						callback(null, DO);
					}
				}
				///////////////////////////////

			],function(err, DO) {
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
					res.send({error: err});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '15');
					res.send(DO);
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + 'The Part AWB does not exist (invalid query)');
			return res.send({error: 'The Part AWB does not exist (invalid query)'});
		}
	},
	do: function(req, res) {
		if(req.query.do) {
			sails.config.globals.async.waterfall([
				function(callback) {
					Do.findOne({_id:req.query.do}, function(err, DO){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + err);
							callback('Error finding DO', null, null, null,null,null);
						} else {
							if(DO) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
								callback(null, DO);
							} else {
								callback('Could not find DO', null, null, null,null,null);
							}
						}
					});
				},
				function(DO, callback) {
					PartAwb.findOne({_id: DO.part_awb}, function(err, part_awb){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + err);
							callback('Error finding part awb', null, null, null,null,null);
						} else {
							if(part_awb) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
								callback(null, DO, part_awb);
							} else {
								callback('could not find part awb', null, null, null,null,null);
							}
						}
					});
				},
				function(DO, part_awb, callback) {
					AwbUserData.findOne({_id: DO.awb_user_data}, function(err, awb_user_data){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + err);
							callback('Error finding awb', null, null, null,null,null);
						} else {
							if(awb_user_data) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
								callback(null, DO, part_awb, awb_user_data);
							} else {
								callback('could not find awb',null,null,null,null,null);
							}
						}
					});
				},
				function(DO, part_awb, awb_user_data, callback) {
					Igm.findOne({igm_number: part_awb.igm_number}, function(err, igm){
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + err);
							callback('Error finding IGM',null,null,null,null,null);
						} else {
							if(igm) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
								callback(null, DO, part_awb, awb_user_data, igm);
							} else {
								callback('could not find igm',null,null,null,null,null);
							}
						}
					});
				},
				function(DO, part_awb, awb_user_data, igm, callback) {
					CityConstants.findOne({
						and : [
							{ iata_code: igm.igm_city},
							{ expires_on: { '>': DO.do_issue_date }},
							{ effective_from: { '<': DO.do_issue_date }}
						]
					}, function(err, constant) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (createdo - post)' + err);
							callback('error finding city constants while showing DO', null,null,null,null,null);
						} else {
							if(constant) {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
								callback(null, DO, part_awb, awb_user_data, igm, constant);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get - error case', '7');
								callback('could not find city constants while showing DO', null,null,null,null,null);
							}
						}
					});
				}
			], function(err, DO, part_awb, awb_user_data, igm, constant){
				if(err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + err);
					return res.view('pages/imlost', {error: err});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
					return res.view('pages/do', {part_awb: part_awb, awb_user_data: awb_user_data, igm: igm, DO:DO, constant: constant});
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (do - get)' + 'Invalid DO info requested');
			res.send('Invalid DO info requested')
		}
	},
	voiddo: function(req, res) {
		sails.config.globals.async.waterfall([
			function(callback) {
				Do.update({_id:req.body.do_id}).set({void_on: Date.now(), void_reason: req.body.selected_reason, void_explanation: req.body.user_typed_reason}).fetch().exec(function(err, voided_do) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voiddo - post)' + err);
						callback('Error updating DO while voiding', null);
					} else {
						if(voided_do && voided_do.length != 0) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
							callback(null, voided_do[0]);
						} else {
							callback('failed to void the DO', null);
						}
					}
				});
			},
			/*function(voided_do, callback) {
				Do.create({
					do_number: 'new_do_' + Date.now(),
					part_awb: voided_do.part_awb,
					awb_number: voided_do.awb_number,
					do_issue_date: voided_do.do_issue_date,
					do_include_for_invoice: voided_do.do_include_for_invoice,
					issued_by: 'new_do_' + voided_do.issued_by
				}, function(err, new_do){
					if(err){
						callback('Error in creating new DO', null);
					}
					callback(null, new_do);
				})
			}*/
			function(voided_do, callback) {
				PartAwb.update({_id: voided_do.part_awb, void_on: 0}).set({do_document: ''}).fetch().exec(function(err, part_awb) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voiddo - post)' + err);
						callback('Error updating part awb while voiding', null);
					} else {
						if(part_awb) {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
							callback(null, part_awb);
						} else {
							callback('failed to update part awb while voiding the DO', null);
						}
					}
				});
			}
		], function(err, part_awb) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (voiddo - post)' + err);
				res.send({error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
				res.send({success: true});
			}
		});
		/*sails.config.globals.async.waterfall([
			function(callback) {
				PartAwb.findOne({_id: req.body.part_awb_id}, function(err, part_awb) {
					if(err) {
						res.send('error occured while voiding the DO', null);
					} else {
						if(part_awb.void_on == 0) {
							callback(null, part_awb);
						} else {
							res.send('this AWB cannot be void', null);
						}
					}
				});
			},
			function(part_awb, callback) {
				if(part_awb) {
					PartAwb.update({_id: part_awb.id}).set({do_document: DO.id, void_on: Date.now()}).exec(function(err, updated_part_awb) {
						if(err)
							callback('an error occured while setting the void date to part_awb')
						if(updated_part_awb)
							callback(null, updated_part_awb);
						else
							callback('an error occured', null);
					});
				}
			},
			function(part_awb, callback) {

			}
		], function(err, final) {
			if(err) {
				console.log(err);
				res.send({error: err});
			} else {

			}
		});*/
	},
	/*dopdf: function(req, res) {
		wkhtmltopdf.command = 'C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe';
		wkhtmltopdf('http://localhost:1337/doo', { output: 'outdo.pdf' });
		res.send('outdo.pdf');
	}*/
	dopdf: function(req, res) {
		const phantom = require('phantom');
		(async function() {
			const instance = await phantom.create();
			const page = await instance.createPage();

			await page.property('viewportSize', { width: 1024, height: 600 });
			const status = await page.open('http://192.168.43.246:1337/do');

			await page.render('do.pdf');

			await instance.exit();
		})();
	},
	getDOs: function(req, res) {
		//	Input will be consignee & CityIATA
		AwbUserData.find({consignee: req.query.consignee, void_on: 0, invoice_document: '', do_document: {'!=':''}}, function(err, awb_user_datas) {
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getDOs - get)' + err);
				res.send('error in finding the AWB user Datas', null);
			} else {
				if(awb_user_datas.length > 0) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
					callback(null, awb_user_datas);
				} else {
					callback('could not find any AWBUserData for invoicing', null);
				}
			}
		});
	},
	
	getDemurrage: function(req, res) {
		res.view('pages/demurrage');
	},
	
	postDemurrage: async function(req, res) {
		let awb_number = req.body.awb_number;
		let amount_usd = Number(req.body.amount_usd);
		
		if(isNaN(amount_usd)) {
			return res.json({result: '' + req.body.amount_usd + '  is not a valid amount'});
		}
		
		let awb_user_data = await AwbUserData.findOne({awb_number: awb_number, void_on: 0});
		if(awb_user_data) {
			
			if(awb_user_data.invoice_document) {
				return res.json({result: '' + req.body.awb_number + ' has invoice issued. Cannot update it.'});
			}
			
			if(!awb_user_data.do_document) {
				return res.json({result: '' + req.body.awb_number + ' does not have DO issued. Cannot update it.'});
			}
			
			if(awb_user_data.misc_charges > 0) {
				return res.json({result: '' + req.body.awb_number + ' has already applicable misc charges of Rs. ' + sails.config.globals.price_formatter(awb_user_data.misc_charges)});
			}
			
			let usd = await ExchangeRates.findOne({
				and : [
					{ currency: 'USD'},
					{ expires_on: { '>': Date.now() }},
					{ effective_from: { '<': Date.now() }}
				]
			});
			
			if(usd) {
				let misc_charges = usd.value_local * amount_usd;
				let igst = awb_user_data.igst;
				let cgst = awb_user_data.cgst;
				let sgst = awb_user_data.sgst;
				
				if(awb_user_data.igst > 0) {
					igst += (misc_charges * 0.18);
				}
				
				if(awb_user_data.cgst > 0) {
					cgst += (misc_charges * 0.09);
				}
				
				if(awb_user_data.sgst > 0) {
					sgst += (misc_charges * 0.09);
				}
				
				console.log('misc = ' + misc_charges);
				console.log('igst = ' + igst);
				console.log('cgst = ' + cgst);
				console.log('sgst = ' + sgst);
				
				await AwbUserData.update({id: awb_user_data.id}).set({misc_charges: misc_charges, igst: igst, cgst: cgst, sgst: sgst});
				
				res.json({result: 'Amount of Rs.' + sails.config.globals.price_formatter(misc_charges) + ', with igst=' + sails.config.globals.price_formatter(igst) + ', cgst=' + sails.config.globals.price_formatter(cgst) + ', sgst=' + sails.config.globals.price_formatter(sgst) + ' added for invoicing'});
			} else {
				return res.json({result: 'Error in performing the task - error 1'});
			}
		} else {
			return res.json({result: '' + req.body.awb_number + '  is not found'});
		}
	}
};
