/**
 * DailyReportsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	dailyreports: function (req, res) {
		Ports.find({
			where: {
				and: [{
						"is_inward_port": true
					},
					{
						iata_code: req.user.iata_code
					}
				]
			},
			sort: 'iata_code'
		}, function (err, ports) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (dailyreports - get)' + err);
				return res.view('pages/imlost', {
					error: 'An error occured while finding the ports'
				});
			} else {
				return res.view('pages/dailyreports', {
					airportlistdetails: ports
				});
			}
		});
	},
	generateagentperformancereports: function (req, res) {
		var city = req.body.inwardcargo_agentperformancereports_city;
		var from = new Date(Date.parse(req.body.inwardcargo_agentperformancereports_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_agentperformancereports_to_date_input)).setHours(23, 59, 59, 999);
		//var paymentmode = req.body.inwardcargo_importcsrreports_paymentmode;
		var customertype = req.body.inwardcargo_agentperformancereports_customertype;
		var csr_collection = [];
		var result_json = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				PartAwb.find({
					where: {
						and: [{
								flight_date: {
									'>=': from
								}
							},
							{
								flight_date: {
									'<=': to
								}
							},
							{
								igm_city: city
							},
							{
								part_awb_include_for_invoice: true
							},
							{
								void_on: 0
							}
						]
					},
					sort: 'flight_date'
				}, function (err, partawbs) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
						callback('error partawbs igms', null);
					} else {
						if (partawbs && partawbs.length > 0) {
							callback(null, partawbs);
						} else {
							callback('No partawbs found', null);
						}
					}
				});
			},
			function (partawbs, callback) {
				async.eachSeries(partawbs, function (partawb, callback) {
					var csr = {};
					var and_query = [];
					and_query.push({awb_number: partawb.awb_number});
					and_query.push({void_on: 0});
					if(customertype != 'All')
						and_query.push({consignee_type: customertype});
					
					AwbUserData.findOne({
						where: {
							and: and_query
						}
					}, function (err, awbuserdata) {
						if(awbuserdata == undefined) {
							callback(null, true);	//	Keep skipping if you do not find any awb which does not match the criteria, This is mostly because user may request for query with filters.
						} else {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
								callback('error finding awbuserdata', null);
							} else {
								async.series([
										function (callback) {
											csr.commodity = partawb.commodity;
											csr.awbuserdata = awbuserdata;
											callback(null, true);
										},
										function (callback) {
											if (awbuserdata.invoice_document) {
												Invoice.findOne({
													where: {
														and: [{
																id: awbuserdata.invoice_document
															},
															{
																void_on: 0
															}
														]
													}
												}, function (err, invoicedocument) {
													if (err) {
														sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
														callback('error finding invoicedocument', null);
													} else {
														csr.invoicedocument = invoicedocument;
														csr.flight_number = partawb.flight_number;
														csr.flight_date = partawb.flight_date;
														csr_collection.push(csr);
														callback(null, true);
													}
												});
											} else {
												callback(null, true);
											}
										}
									],
									// optional callback
									function (err, results) {
										if (err) {
											sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
											callback(err, null);
										} else {
											callback(null, true);
										}
									});
							}
						}
					});
				}, function (err) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
						callback(err, null);
					} else {
						callback(null, true);
					}
				});
			},
			function (result, callback) {
				for (var i = 0; i < csr_collection.length; i++) {
					var singledata = {};
					singledata.customer_name = csr_collection[i].awbuserdata.consignee_name;
					singledata.customer_type = csr_collection[i].awbuserdata.consignee_type;
					singledata.awb_number = csr_collection[i].awbuserdata.awb_number;
					singledata.flight_number = csr_collection[i].flight_number;
					singledata.destination = csr_collection[i].awbuserdata.igm_city;
					if(csr_collection[i].flight_date) {
						let f_date = new Date(csr_collection[i].flight_date);
						singledata.flight_date = f_date.getDate() + "/" + (f_date.getMonth() + 1) + "/" + f_date.getFullYear();
						//singledata.flight_date = sails.config.globals.date_formatter(csr_collection[i].flight_date);
					}
					singledata.cc_type = csr_collection[i].awbuserdata.collect_charges_type;
					singledata.do_amount = csr_collection[i].awbuserdata.do_charge;
					singledata.no_of_hawb = csr_collection[i].awbuserdata.no_of_hawb;
					singledata.hawb_amount = csr_collection[i].awbuserdata.break_bulk_charge;
					singledata.direct_delivery_charge = csr_collection[i].awbuserdata.direct_delivery_charge;
					singledata.baggage_charge = csr_collection[i].awbuserdata.baggage_charge;
					singledata.cartage_charge = csr_collection[i].awbuserdata.cartage_charge;
					singledata.misc_charges = csr_collection[i].awbuserdata.misc_charges;
					singledata.collect_charge = csr_collection[i].awbuserdata.collect_charge;
					
					singledata.sgst = Number(sails.config.globals.price_formatter(csr_collection[i].awbuserdata.sgst));
					singledata.cgst = Number(sails.config.globals.price_formatter(csr_collection[i].awbuserdata.cgst));
					singledata.igst = Number(sails.config.globals.price_formatter(csr_collection[i].awbuserdata.igst));
					
					singledata.total = sails.config.globals.price_formatter(csr_collection[i].awbuserdata.do_charge + csr_collection[i].awbuserdata.break_bulk_charge + csr_collection[i].awbuserdata.direct_delivery_charge + csr_collection[i].awbuserdata.baggage_charge + csr_collection[i].awbuserdata.cartage_charge + csr_collection[i].awbuserdata.misc_charges + csr_collection[i].awbuserdata.collect_charge + csr_collection[i].awbuserdata.sgst + csr_collection[i].awbuserdata.cgst + csr_collection[i].awbuserdata.igst);
					
					singledata.invoice_number = csr_collection[i].invoicedocument ? csr_collection[i].invoicedocument.invoice_number : '';
					singledata.invoice_date = csr_collection[i].invoicedocument ? new Date(csr_collection[i].invoicedocument.invoice_issue_date) : '';
					singledata.no_of_hawb = csr_collection[i].awbuserdata.no_of_hawb;
					singledata.expected_weight = csr_collection[i].awbuserdata.expected_weight;
					singledata.chargable_weight = csr_collection[i].awbuserdata.chargable_weight;
					singledata.month = csr_collection[i].invoicedocument ? new Date(csr_collection[i].invoicedocument.invoice_issue_date).getMonth() + 1 : '';
					singledata.year = csr_collection[i].invoicedocument ? new Date(csr_collection[i].invoicedocument.invoice_issue_date).getFullYear() : '';
					singledata.commodity = csr_collection[i].commodity;
					result_json.push(singledata);
				}
				callback(null, true);
			}
		], function (err, result) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateagentperformancereports - post)' + err);
				return res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				// You can define styles as json object
				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFF00'
							}
						}
					}
				};

				const specification = {};
				specification.customer_name = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer name'
				};
				specification.customer_type = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer type'
				};
				specification.awb_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'AWB no'
				};
				specification.destination = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Destination'
				};
				specification.flight_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Flight No'
				};
				specification.flight_date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Flight Date'
				};
				specification.cc_type = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'CC Type'
				};
				specification.do_amount = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'DO Amount'
				};
				specification.no_of_hawb = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'No of HAWBs'
				};
				specification.hawb_amount = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'HAWB Amount'
				};
				specification.direct_delivery_charge = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Direct Delivery charges'
				};
				specification.baggage_charge = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Baggage charges'
				};
				specification.cartage_charge = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Cartage Charges'
				};
				specification.misc_charges = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Misc Charges'
				};
				specification.collect_charge = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Freight amt (CC)'
				};
				specification.sgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'SGST'
				};
				specification.cgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'CGST'
				};
				specification.igst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'IGST'
				};
				specification.total = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total'
				};
				specification.invoice_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Invoice no'
				};
				specification.invoice_date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Invoice date'
				};
				specification.no_of_hawb = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total no of houses'
				};
				specification.expected_weight = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Gross weight'
				};
				specification.chargable_weight = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Chargeable weight'
				};
				specification.month = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Month '
				};
				specification.year = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Year'
				};
				specification.commodity = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Commodity'
				};

				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'Agent Performance Report', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);
				res.attachment('agentperformance.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generateimportcsrreports: function (req, res) {
		var city = req.body.inwardcargo_importcsrreports_city;
		var from = new Date(Date.parse(req.body.inwardcargo_importcsrreports_from_date_input)).setHours(0,0,0,0);
		var to = new Date(Date.parse(req.body.inwardcargo_importcsrreports_to_date_input)).setHours(23,59,59,999);
		var paymentmode = req.body.inwardcargo_importcsrreports_paymentmode;
		var customertype = req.body.inwardcargo_importcsrreports_customertype;
		var csr_collection = [];
		var result_json = [];
		sails.config.globals.async.waterfall([
			function(callback_waterfall){
				PartAwb.find({
					where: {
						and : [
										{ flight_date: { '>=': from }},
										{ flight_date: { '<=': to }},
										{igm_city: city},
										{part_awb_include_for_invoice:true},
										{void_on: 0}
									]
								}, sort: 'flight_date'}
					, function(err, partawbs) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
						callback_waterfall('error partawbs igms', null);
					} else {
						if(partawbs && partawbs.length > 0) {
							callback_waterfall(null, partawbs);
						} else {
							callback_waterfall('No partawbs found', null);
						}
					}
				});
			},function(partawbs, callback_waterfall){
				async.eachSeries(partawbs, function(partawb, callback_each_series) {
					var csr = {};
					var and_query = [];
					and_query.push({awb_number: partawb.awb_number});
					and_query.push({void_on: 0});
					if(customertype != 'All')
						and_query.push({consignee_type: customertype});
					
					csr.partawb = partawb;
					
					AwbUserData.findOne({
						where: {
							and : and_query 
						}
					}, function(err, awbuserdata) {
						if(awbuserdata == undefined) {
							callback_each_series(null, true);	//	Keep skipping if you do not find any awb which does not match the criteria, This is mostly because user may request for query with filters.
						} else {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
								callback_each_series('error finding awbuserdata', null);
							} else {
								async.series([
									function(callback_series) {
										csr.awbuserdata = awbuserdata;
										callback_series(null, true);
									},
									function(callback_series) {
										if(awbuserdata.invoice_document) {
											
											var invoice_and_query = [];
											invoice_and_query.push({id: awbuserdata.invoice_document});
											invoice_and_query.push({void_on:0});
											if(paymentmode != 'All') {
												invoice_and_query.push({payment_mode: paymentmode});
											}
											
											Invoice.findOne({
												where: {
													and : invoice_and_query
															}
														}, function(err, invoicedocument) {
												if(invoicedocument == undefined) {
													callback_series(null, true);
												} else {
													if (err) {
														sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
														callback_series('error finding invoicedocument', null);
													} else {
														csr.invoicedocument = invoicedocument;
														callback_series(null, true);
													}
												}
											});
										} else {
											callback_series(null, true);
										}
									}, function(callback_series){
										if(awbuserdata.invoice_document && awbuserdata.do_document && csr.invoicedocument != undefined) {
											Do.findOne({
												where: {
													and : [
																	{id: awbuserdata.do_document},
																	{void_on: 0}
																]
															}
														}, function(err, do_document) {
												if (err) {
													sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
													callback_series('error finding dodocument', null);
												} else {
													csr.do_document = do_document;
													csr_collection.push(csr);
													callback_series(null, true);
												}
											});
										} else {
											callback_series(null, true);
										}
									}
								],
								// optional callback_series
								function(err, results) {
									if(err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
										callback_each_series(err, null);
									} else {
										callback_each_series(null, true);
									}
								});
							}
						}
					});
				}, function(err) {
						if( err ) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
							callback_waterfall(err, null);
						} else {
							callback_waterfall(null, true);
						}
				});
			},function(result, callback_waterfall){
				for(var i = 0;i< csr_collection.length; i++) {
					var singledata = {};
					singledata.igm_number = csr_collection[i].partawb.igm_number;
					singledata.awb_number = csr_collection[i].awbuserdata.awb_number;
					singledata.customer_name = csr_collection[i].awbuserdata.consignee_name;
					singledata.do_number = csr_collection[i].do_document.do_number;
					let do_date = new Date(csr_collection[i].do_document.do_issue_date);
					singledata.do_date = do_date;
					singledata.do_time = sails.config.custom.leftPad(do_date.getHours(), 2) + ':' + sails.config.custom.leftPad(do_date.getMinutes(), 2);
					singledata.invoice_number = csr_collection[i].invoicedocument.invoice_number;
					singledata.invoice_date = new Date(csr_collection[i].invoicedocument.invoice_issue_date);
					singledata.do_amount = csr_collection[i].awbuserdata.do_charge;
					if(csr_collection[i].invoicedocument.payment_mode == 'DD' || csr_collection[i].invoicedocument.payment_mode == 'CHQ' || paymentmode == 'UPI') {
						singledata.chq_dd_no = csr_collection[i].invoicedocument.payment_reference_number;
						singledata.chq_dd_date = new Date(csr_collection[i].invoicedocument.payment_instrument_date);
					} else {
						singledata.chq_dd_no = '';
						singledata.chq_dd_date = '';
					}
					if(csr_collection[i].invoicedocument.payment_mode == 'RTGS') {
						singledata.rtgs_date = new Date(csr_collection[i].invoicedocument.payment_instrument_date);
					} else {
						singledata.rtgs_date = '';
					}
					if(csr_collection[i].invoicedocument.payment_mode == 'CASH') {
						singledata.cash = csr_collection[i].invoicedocument.payment_amount;
					} else {
						singledata.cash = '';
					}
					result_json.push(singledata);
				}
				callback_waterfall(null,true);
			}
		],
		//	callback_waterfall handler
		function(err, result){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (generateimportcsrreports - post)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				const excel = require('node-excel-export');
				// You can define styles as json object
				const styles = {
				  cellYellow: {
					fill: {
					  fgColor: {
						rgb: 'FFFFFF00'
					  }
					}
				  }
				};

				const specification = {};
					specification.igm_number = 				{width: 100, headerStyle: styles.cellYellow,  displayName: 'IGM No'};
					specification.awb_number = 				{width: 100, headerStyle: styles.cellYellow,  displayName: 'AWB No'};
					specification.customer_name = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Customer Name'};
					specification.do_number = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'DO no'};
					specification.do_date = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'DO Date'};
					specification.do_time = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'DO Time'};
					specification.invoice_number = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Inv No '};
					specification.invoice_date = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Inv date'};
					specification.do_amount = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'DO Amount'};
					specification.chq_dd_no = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Cheque/DD no'};
					specification.chq_dd_date = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Cheque/DD date'};
					specification.rtgs_date = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'RTGS Date'};
					specification.cash = 		{width: 100, headerStyle: styles.cellYellow,  displayName: 'Cash'};

				const report = excel.buildExport(
				  [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
						  name: 'Import CSR Report', // <- Specify sheet name (optional)
						  specification: specification, // <- Report specification
						  data: result_json // <-- Report data
						}
				  ]
				);

				res.attachment('importcsr.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generateimportstatisticsreports: function (req, res) {
		var city = req.body.inwardcargo_importstatisticsreports_city;
		var from = new Date(Date.parse(req.body.inwardcargo_importstatisticsreports_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_importstatisticsreports_to_date_input)).setHours(23, 59, 59, 999);
		var total_weight_gross = [];
		var total_number_awbs = [];
		var flight_number = [];
		var inward_date = [];
		var igm_number = [];
		var result_json = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				Igm.find({
					where: {
						and: [{
								inward_date: {
									'>=': from
								}
							},
							{
								inward_date: {
									'<=': to
								}
							},
							{
								igm_city: city
							}
						]
					},
					sort: 'inward_date'
				}, function (err, igms) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateimportstatisticsreports - post)' + err);
						callback('error finding igms', null, null, null);
					} else {
						if (igms && igms.length > 0) {
							callback(null, igms);
						} else {
							callback('No igms found', null, null, null);
						}
					}
				});
			},
			function (igms, callback) {
				async.eachSeries(igms, function (igm, callback) {
					flight_number.push(igm.flight_number);
					inward_date.push(new Date(igm.inward_date));
					igm_number.push(igm.igm_number);
					PartAwb.find({
						igm_number: igm.igm_number,
						void_on: 0
					}, function (err, part_awbs) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateimportstatisticsreports - post)' + err);
							callback('error finding parts of awb');
						} else {
							var total_weight_gross_number = 0;
							for (var i = 0; i < part_awbs.length; i++) {
								total_weight_gross_number = total_weight_gross_number + part_awbs[i].weight_received;
							}
							total_number_awbs.push(part_awbs.length);
							total_weight_gross.push(total_weight_gross_number);
							callback();
						}
					});
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateimportstatisticsreports - post)' + err);
						callback(err, null);
					} else {
						callback(null, true);
					}
				});
			},
			function (result, callback) {
				for (var i = 0; i < total_weight_gross.length; i++) {
					var singledata = {};
					singledata.flight_number = flight_number[i];
					singledata.inward_date = inward_date[i];
					singledata.igm_number = igm_number[i];
					singledata.total_number_awbs = total_number_awbs[i];
					singledata.total_weight_gross = total_weight_gross[i];
					result_json.push(singledata);
				}
				callback(null, true);
			}
		], function (err, result) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generateimportstatisticsreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				// You can define styles as json object
				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFFFF'
							}
						}
					}
				};

				const specification = {};
				specification.flight_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Flight no'
				};
				specification.inward_date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Inward Date'
				};
				specification.igm_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'IGM no'
				};
				specification.total_number_awbs = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total no of AWB\'s'
				};
				specification.total_weight_gross = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total weight (Gross)'
				};

				// Create the excel report.
				// This function will return Buffer
				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'Import Statistics Report', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('importstatisticsreport.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatependingdoreports: function (req, res) {
		var city = req.body.inwardcargo_pendingdoreports_city;
		// var from = new Date(Date.parse(req.body.inwardcargo_importstatisticsreports_from_date_input)).setHours(0,0,0,0);
		// var to = new Date(Date.parse(req.body.inwardcargo_importstatisticsreports_to_date_input)).setHours(23,59,59,999);
		var awb_number = [];
		var customer_name = [];
		var flight_date = [];
		var flight_number = [];
		var inward_date = [];
		var can_status = [];
		var awb_array = [];
		var result_json = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				PartAwb.find({
					where: {
						and: [{
								do_document: ""
							},
							{
								igm_city: city
							},
							{
								void_on: 0
							}
							//{ awb_number: awbuserdata.awb_number}
							//{ part_awb_include_for_invoice: true}
						]
					},
					sort: 'inward_date'
				}, function (err, partawbs) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatependingdoreports - post)' + err);
						callback('error finding partawbs', null);
					} else {
						if (partawbs && partawbs.length > 0) {
							callback(null, partawbs);
						} else {
							callback('No partawbs found', null);
						}
					}
				});
			},
			function (partawbs, callback) {
				async.eachSeries(partawbs, function (partawb, callback) {
					AwbUserData.findOne({
						where: {
							and: [{
									awb_number: partawb.awb_number
								},
								{
									void_on: 0
								}
							]
						}
					}, function (err, awbuserdata) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatependingdoreports - post)' + err);
							callback('error finding partawb');
						} else {
							if (awbuserdata) {
								awb_array.push(awbuserdata.consignee_name);
								callback();
							} else {
								callback();
							}
						}
					});
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatependingdoreports - post)' + err);
						callback(err, null);
					} else {
						callback(null, partawbs);
					}
				});
			},
			function (partawbs, callback) {
				for (var i = 0; i < partawbs.length; i++) {
					var singledata = {};
					singledata.awb_number = partawbs[i].awb_number;
					singledata.origin = partawbs[i].origin;
					singledata.destination = partawbs[i].destination;
					singledata.consignee_name = awb_array[i];
					singledata.flight_date = new Date(partawbs[i].flight_date);
					singledata.flight_number = partawbs[i].flight_number;
					singledata.inward_date = new Date(partawbs[i].inward_date);
					singledata.can_document = (partawbs[i].can_document) ? 'Issued' : 'Not Issued';
					result_json.push(singledata);
				}
				callback(null, true);
			}
		], function (err, result) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatependingdoreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				// You can define styles as json object
				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFFFF'
							}
						}
					}
				};

				const specification = {};
				specification.awb_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'AWB no'
				};
				specification.consignee_name = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer name'
				};
				specification.flight_date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Flight date'
				};
				specification.flight_number = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Flight number'
				};
				specification.inward_date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Inward Date'
				};
				specification.can_document = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Status of CAN'
				};

				// Create the excel report.
				// This function will return Buffer
				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'Import Pending DO Report', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('pendingdoreport.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatedailychallanreports: function (req, res) {
		var city = req.body.inwardcargo_dailychallanreports_city;
		var paymentmode = req.body.inwardcargo_dailychallanreports_paymentmode;
		var from = new Date(Date.parse(req.body.inwardcargo_dailychallanreports_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_dailychallanreports_to_date_input)).setHours(23, 59, 59, 999);
		var all_charges_array = [];
		var result_json = [];
		var queryPaymentMode = paymentmode;
		if (paymentmode == 'CHQ') {
			queryPaymentMode = ['CHQ', 'DD'];
		}
		sails.config.globals.async.waterfall([
			function (callback) {
				Invoice.find({
					where: {
						and: [{
								payment_received_date: {
									'>=': from
								}
							},
							{
								payment_received_date: {
									'<=': to
								}
							},
							{
								payment_mode: queryPaymentMode
							},
							{
								invoice_number: {
									endsWith: city
								}
							}
						]
					},
					sort: 'payment_received_date'
				}, function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailychallanreports - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if (invoices && invoices.length > 0) {
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
			function (invoices, callback) {
				var awbuserdata_array = [];
				async.eachSeries(invoices, function (invoice, callback) {
					if (invoice) {
						AwbUserData.find({
							//awb_number : invoice.awbs
							_id: invoice.awb_user_datas
						}, function (err, awbuserdatas) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailychallanreports - post)' + err);
								callback('Awb Record not found');
							} else {
								if (awbuserdatas) {
									var freight_charges = 0;
									var do_other_charges = 0;
									var igst_charges = 0;
									var cgst_charges = 0;
									var sgst_charges = 0;
									var total_charges = 0;
									var charges_details = {};
									for (var i = 0; i < awbuserdatas.length; i++) {
										freight_charges = freight_charges + awbuserdatas[i].collect_fee + awbuserdatas[i].collect_charge;
										do_other_charges = do_other_charges + awbuserdatas[i].break_bulk_charge + awbuserdatas[i].cartage_charge + awbuserdatas[i].do_charge + awbuserdatas[i].baggage_charge + awbuserdatas[i].direct_delivery_charge + awbuserdatas[i].misc_charges;
										igst_charges = igst_charges + awbuserdatas[i].igst;
										cgst_charges = cgst_charges + awbuserdatas[i].cgst;
										sgst_charges = sgst_charges + awbuserdatas[i].sgst;
										total_charges = freight_charges + do_other_charges + igst_charges + cgst_charges + sgst_charges;
									}
									charges_details.invoice_id = awbuserdatas[0].invoice_document;
									charges_details.received_from = awbuserdatas[0].consignee_name;
									charges_details.freight_charges_amount_all_awb = freight_charges;
									charges_details.do_other_charges_amount_all_awb = do_other_charges;
									charges_details.igst_charges_amount_all_awb = igst_charges;
									charges_details.cgst_charges_amount_all_awb = cgst_charges;
									charges_details.sgst_charges_amount_all_awb = sgst_charges;
									charges_details.total_charges_amount_all_awb = total_charges;
									all_charges_array.push(charges_details);
									// freight_charges_array.push(freight_charges);
									// do_other_charges_array.push(do_other_charges);
									var awbs = [];
									for (var j = 0; j < awbuserdatas.length; j++)
										awbs.push(awbuserdatas[j].awb_number);

									awbuserdata_array.push(awbs);
									callback();
								} else {
									callback('Awb Record not found');
								}
							}
						})
					} else {
						callback('Awb Record not found');
					}
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailychallanreports - post)' + err);
						callback(err, null, null, null);
					} else {
						callback(null, invoices, awbuserdata_array);
					}
				});
			},
			function (invoices, awbuserdata_array, callback) {
				Ports.find({
					where: {
						and: [{
								"is_inward_port": true
							},
							{
								iata_code: req.user.iata_code
							}
						]
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailychallanreports - post)' + err);
						callback('something went wrong while finding airports', null, null, null);
					} else {
						callback(null, ports, invoices, awbuserdata_array);
					}
				});
			},
			function (ports, invoices, awbuserdata_array, callback) {
				for (var i = 0; i < invoices.length; i++) {
					var singledata = {};
					singledata.sr_no = i + 1;
					singledata.date = new Date(invoices[i].payment_instrument_date);
					if (paymentmode == 'CHQ' || paymentmode == 'DD') {
						singledata.cheque_no = invoices[i].payment_reference_number;
						singledata.bank_name = invoices[i].payment_drawn_on;
					}
					singledata.freight_charges = sails.config.globals.price_formatter(all_charges_array[i].freight_charges_amount_all_awb);
					singledata.do_charges = sails.config.globals.price_formatter(all_charges_array[i].do_other_charges_amount_all_awb);
					singledata.igst = sails.config.globals.price_formatter(all_charges_array[i].igst_charges_amount_all_awb);
					singledata.sgst = sails.config.globals.price_formatter(all_charges_array[i].sgst_charges_amount_all_awb);
					singledata.cgst = sails.config.globals.price_formatter(all_charges_array[i].cgst_charges_amount_all_awb);
					singledata.total = sails.config.globals.price_formatter(Math.ceil(all_charges_array[i].total_charges_amount_all_awb));
					singledata.received_from = all_charges_array[i].received_from;
					singledata.particulars = awbuserdata_array[i]; //invoices[i].awb_user_datas;
					singledata.excess_short = sails.config.globals.price_formatter(Math.ceil(invoices[i].amount_billed - invoices[i].payment_amount));
					singledata.comments = invoices[i].payment_comments;
					result_json.push(singledata);
				}
				callback(null, ports, invoices, awbuserdata_array);
			}
		], function (err, ports, invoices, awbuserdata_array) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailychallanreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				// You can define styles as json object
				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFF00'
							}
						}
					}
				};

				const specification = {};
				specification.sr_no = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Sr. No.'
				};
				specification.date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Date'
				};
				if (paymentmode == 'CHQ' || paymentmode == 'DD') {
					specification.cheque_no = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'Cheque/DD no.'
					};
					specification.bank_name = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'Bank Name'
					};
				}
				specification.freight_charges = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Freight charges and CC charges'
				};
				specification.do_charges = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Do Charges / Cartage and other charges'
				};
				specification.igst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'IGST'
				};
				specification.sgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'SGST'
				};
				specification.cgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'CGST'
				};
				specification.total = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total'
				};
				specification.received_from = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Received From'
				};
				specification.particulars = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Particulars',
					alignment: {
						wrapText: true
					}
				};
				specification.excess_short = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Excess / Short'
				};
				specification.comments = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Comments'
				};

				// Create the excel report.
				// This function will return Buffer
				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'CashReport', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('dailychallanreport.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatedailygstreports: function (req, res) {
		var city = req.body.inwardcargo_dailygstreports_city;
		var paymentmode = req.body.inwardcargo_dailygstreports_paymentmode;
		var from = new Date(Date.parse(req.body.inwardcargo_dailygstreports_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_dailygstreports_to_date_input)).setHours(23, 59, 59, 999);
		var all_charges_array = [];
		var result_json = [];
		var allgst_state = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				Gst.find({
					where: {},
					sort: 'gst_code'
				}, function (err, gsts) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('error finding gst', null, null, null);
					} else {
						if (gsts && gsts.length > 0) {
							allgst_state = gsts;
							callback(null);
						} else {
							callback('No gst found', null, null, null);
						}
					}
				});
			},
			function (callback) {
				var query = {};
				query.where = {};
				if (paymentmode == 'ALL') {
					query.where.and = [];
					query.where.and.push({
						payment_received_date: {
							'>=': from
						}
					});
					query.where.and.push({
						payment_received_date: {
							'<=': to
						}
					}, );
					query.where.and.push({
						invoice_number: {
							endsWith: city
						}
					});
					query.sort = 'payment_received_date';
				} else {
					query.where.and = [];
					query.where.and.push({
						payment_received_date: {
							'>=': from
						}
					});
					query.where.and.push({
						payment_received_date: {
							'<=': to
						}
					}, );
					query.where.and.push({
						invoice_number: {
							endsWith: city
						}
					});
					query.where.and.push({
						payment_mode: paymentmode
					});
					query.where.and.push({
						void_on: 0
					});
					query.sort = 'payment_received_date';
				}
				Invoice.find(query, function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if (invoices && invoices.length > 0) {
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
			function (invoices, callback) {
				var awbuserdata_array = [];
				async.eachSeries(invoices, function (invoice, callback) {
					if (invoice) {
						AwbUserData.find({
							//awb_number : invoice.awbs
							_id: invoice.awb_user_datas
						}, async function (err, awbuserdatas) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
								callback('Awb Record not found');
							} else {
								if (awbuserdatas && awbuserdatas.length > 0) {
									var freight_charges = 0;
									var do_other_charges = 0;
									var igst_charges = 0;
									var cgst_charges = 0;
									var sgst_charges = 0;
									var total_charges = 0;
									var charges_details = {};
									for (var i = 0; i < awbuserdatas.length; i++) {
										freight_charges = freight_charges + awbuserdatas[i].collect_fee + awbuserdatas[i].collect_charge;
										do_other_charges = do_other_charges + awbuserdatas[i].break_bulk_charge + awbuserdatas[i].cartage_charge + awbuserdatas[i].do_charge + awbuserdatas[i].baggage_charge + awbuserdatas[i].direct_delivery_charge + awbuserdatas[i].misc_charges;
										igst_charges = igst_charges + awbuserdatas[i].igst;
										cgst_charges = cgst_charges + awbuserdatas[i].cgst;
										sgst_charges = sgst_charges + awbuserdatas[i].sgst;
										total_charges = freight_charges + do_other_charges + igst_charges + cgst_charges + sgst_charges;
									}
									charges_details.invoice_id = awbuserdatas[0].invoice_document;
									charges_details.received_from = awbuserdatas[0].consignee_name;
									charges_details.gstin_of_company = awbuserdatas[0].gstin;
									charges_details.gstin_of_customer = awbuserdatas[0].consignee_gstn;
									charges_details.hsn_code = awbuserdatas[0].hsn_code;
									charges_details.customer_name = awbuserdatas[0].consignee_name;
									charges_details.customer_address = awbuserdatas[0].consignee_address;
									charges_details.customer_pincode = awbuserdatas[0].consignee_pincode;

									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].gstin.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.state = allgst_state[i].state_name;
										}
									}
									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].consignee_gstn.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.pos = allgst_state[i].state_name;
										}
									}
									if(charges_details.pos == undefined) {
										charges_details.pos = charges_details.state;
									}

									charges_details.freight_charges_amount_all_awb = freight_charges;
									charges_details.do_other_charges_amount_all_awb = do_other_charges;
									charges_details.igst_charges_amount_all_awb = igst_charges;
									charges_details.cgst_charges_amount_all_awb = cgst_charges;
									charges_details.sgst_charges_amount_all_awb = sgst_charges;
									charges_details.total_charges_amount_all_awb = total_charges;//Math.ceil(total_charges);

									let irn = await IRN.findOne({invoice_number: invoice.invoice_number, type_of_invoice: sails.config.custom.irn_invoice_types.invoice, status: sails.config.custom.irn_job_status.done});

									charges_details.irn = irn ? irn.irn : "";

									all_charges_array.push(charges_details);
									var awbs = [];
									for (var j = 0; j < awbuserdatas.length; j++)
										awbs.push(awbuserdatas[j].awb_number);

									awbuserdata_array.push(awbs);
									callback();
								} else {
									callback('Awb Record not found');
								}
							}
						})
					} else {
						callback('Awb Record not found');
					}
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback(err, null, null, null);
					} else {
						callback(null, invoices, awbuserdata_array);
					}
				});
			},
			function (invoices, awbuserdata_array, callback) {
				Ports.find({
					where: {
						and: [{
								"is_inward_port": true
							},
							{
								iata_code: req.user.iata_code
							}
						]
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('something went wrong while finding airports', null, null, null);
					} else {
						callback(null, ports, invoices, awbuserdata_array);
					}
				});
			},
			function (ports, invoices, awbuserdata_array, callback) {
				for (var i = 0; i < invoices.length; i++) {
					var singledata = {};
					singledata.sr_no = i + 1;
					singledata.comapny_name = sails.config.globals.airlines_name;
					singledata.state = all_charges_array[i].state;
					singledata.gstin_of_company = all_charges_array[i].gstin_of_company;
					singledata.gstin_of_customer = all_charges_array[i].gstin_of_customer;
					singledata.invoice_no = invoices[i].invoice_number;
					singledata.date = sails.config.custom.getReadableDate(invoices[i].invoice_issue_date, false, '/');
					singledata.value = sails.config.globals.price_formatter(all_charges_array[i].do_other_charges_amount_all_awb + all_charges_array[i].freight_charges_amount_all_awb/*all_charges_array[i].total_charges_amount_all_awb - all_charges_array[i].sgst_charges_amount_all_awb - all_charges_array[i].cgst_charges_amount_all_awb - all_charges_array[i].igst_charges_amount_all_awb*/);
					singledata.goods_or_service = 'Transport of goods by air';
					singledata.hsn_code = all_charges_array[i].hsn_code;
					singledata.taxbale_value = sails.config.globals.price_formatter(all_charges_array[i].do_other_charges_amount_all_awb/*all_charges_array[i].total_charges_amount_all_awb - all_charges_array[i].freight_charges_amount_all_awb - all_charges_array[i].sgst_charges_amount_all_awb - all_charges_array[i].cgst_charges_amount_all_awb - all_charges_array[i].igst_charges_amount_all_awb*/);
					singledata.igst_perc_of_tax = '';
					singledata.igst = sails.config.globals.price_formatter(all_charges_array[i].igst_charges_amount_all_awb);
					singledata.sgst_perc_of_tax = '';
					singledata.sgst = sails.config.globals.price_formatter(all_charges_array[i].sgst_charges_amount_all_awb);
					singledata.cgst_sgst_perc_of_tax = '';
					singledata.cgst = sails.config.globals.price_formatter(all_charges_array[i].cgst_charges_amount_all_awb);
					singledata.total = sails.config.globals.price_formatter(Math.ceil(all_charges_array[i].total_charges_amount_all_awb));
					singledata.difference = sails.config.globals.price_formatter(Math.ceil(all_charges_array[i].total_charges_amount_all_awb) - all_charges_array[i].total_charges_amount_all_awb);
					singledata.payment_mode = invoices[i].payment_mode;
					if (paymentmode == 'ALL' || paymentmode == 'CHQ' || paymentmode == 'DD' || paymentmode == 'RTGS' || paymentmode == 'UPI') {
						singledata.cheque_no = invoices[i].payment_reference_number;
						singledata.bank_name = (paymentmode == 'RTGS') ? '' : invoices[i].payment_drawn_on;
					} else {
						singledata.cheque_no = '';
						singledata.bank_name = '';
					}
					singledata.pos = /*(paymentmode == 'RTGS') ? '' :*/ all_charges_array[i].pos;
					singledata.payment_comments = invoices[i].payment_comments;
					singledata.customer_name = all_charges_array[i].customer_name.replace(/[&\/\\#,+-/_@()$~%.'":;*?<>{}]/g, '');
					singledata.customer_address = all_charges_array[i].customer_address.replace(/[&\/\\#,+-/_@()$~%.'":;*?<>{}]/g, ' ');
					singledata.customer_pincode = all_charges_array[i].customer_pincode;

					singledata.irn = all_charges_array[i].irn;

					result_json.push(singledata);
				}
				callback(null, ports, invoices, awbuserdata_array);
			}
		], function (err, ports, invoices, awbuserdata_array) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFF00'
							}
						}
					}
				};

				// You can define styles as json object
				const styles_monthly = {
					cellskyblue: {
						fill: {
							fgColor: {
								rgb: '06e2c9'
							}
						}
					}
				};

				const specification = {};
				specification.sr_no = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Sr. No.'
				};
				specification.comapny_name = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Company Name'
				};
				specification.state = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'State'
				};
				specification.gstin_of_company = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'GSTIN of company'
				};
				specification.gstin_of_customer = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'GSTIN of customer'
				};
				specification.invoice_no = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Invoice no.'
				};
				specification.date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Date'
				};
				specification.value = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Value'
				};
				specification.goods_or_service = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Goods/Service'
				};
				specification.hsn_code = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'HSN/SAC'
				};
				specification.taxbale_value = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Taxable value'
				};
				specification.igst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.igst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'IGST Amt'
				};
				specification.sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.sgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'SGST Amt'
				};
				specification.cgst_sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.cgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'CGST Amt'
				};
				specification.total = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total value'
				};
				specification.difference = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Difference'
				};
				specification.payment_mode = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Pymt mode'
				};
				if (paymentmode == 'CHQ' || paymentmode == 'DD' || paymentmode == 'RTGS' || paymentmode == 'UPI') {
					specification.cheque_no = (paymentmode == 'RTGS') ? {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'RTGS details'
					} : {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'Chq/DD No'
					};
					specification.bank_name = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'BANK'
					};
				} else {
					specification.cheque_no = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: ''
					};
					specification.bank_name = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: ''
					};
				}
				specification.pos = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'POS'
				};
				specification.payment_comments = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Remarks'
				};
				specification.customer_name = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer Name'
				};
				specification.customer_address = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer Address'
				};
				specification.customer_pincode = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Customer Pincode'
				};
				if(sails.config.custom.e_invoice_supported) {
					specification.irn = {
						width: 300,
						headerStyle: styles.cellYellow,
						displayName: 'IRN'
					};
				}

				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'GSTReport', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('dailygstreport.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatedailygstreports_v2: function (req, res) {
		var city = req.body.inwardcargo_dailygstreports_city;
		var paymentmode = req.body.inwardcargo_dailygstreports_paymentmode;
		var from = new Date(Date.parse(req.body.inwardcargo_dailygstreports_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_dailygstreports_to_date_input)).setHours(23, 59, 59, 999);
		var all_charges_array = [];
		var result_json = [];
		var allgst_state = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				Gst.find({
					where: {},
					sort: 'gst_code'
				}, function (err, gsts) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('error finding gst', null, null, null);
					} else {
						if (gsts && gsts.length > 0) {
							allgst_state = gsts;
							callback(null);
						} else {
							callback('No gst found', null, null, null);
						}
					}
				});
			},
			function (callback) {
				var query = {};
				query.where = {};
				if (paymentmode == 'ALL') {
					query.where.and = [];
					query.where.and.push({
						payment_received_date: {
							'>=': from
						}
					});
					query.where.and.push({
						payment_received_date: {
							'<=': to
						}
					}, );
					query.where.and.push({
						invoice_number: {
							endsWith: city
						}
					});
					query.sort = 'payment_received_date';
				} else {
					query.where.and = [];
					query.where.and.push({
						payment_received_date: {
							'>=': from
						}
					});
					query.where.and.push({
						payment_received_date: {
							'<=': to
						}
					}, );
					query.where.and.push({
						invoice_number: {
							endsWith: city
						}
					});
					query.where.and.push({
						payment_mode: paymentmode
					});
					query.where.and.push({
						void_on: 0
					});
					query.sort = 'payment_received_date';
				}
				Invoice.find(query, function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if (invoices && invoices.length > 0) {
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
			function (invoices, callback) {
				var awbuserdata_array = [];
				async.eachSeries(invoices, function (invoice, callback) {
					if (invoice) {
						AwbUserData.find({
							//awb_number : invoice.awbs
							_id: invoice.awb_user_datas
						}, function (err, awbuserdatas) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
								callback('Awb Record not found');
							} else {
								if (awbuserdatas && awbuserdatas.length > 0) {
									var awb_nos = [];
									var freight_charges = [];
									var do_other_charges = [];
									var igst_charges = [];
									var cgst_charges = [];
									var sgst_charges = [];
									var total_charges = [];
									
									var charges_details = {};
									
									var multi_awbs = awbuserdatas.length > 1;
									
									for (var i = 0; i < awbuserdatas.length; i++) {
										awb_nos.push(awbuserdatas[i].awb_number);
										freight_charges.push(
											(awbuserdatas[i].collect_fee ? awbuserdatas[i].collect_fee : 0) + 
											(awbuserdatas[i].collect_charge ? awbuserdatas[i].collect_charge : 0));
										do_other_charges.push(
											(awbuserdatas[i].break_bulk_charge ? awbuserdatas[i].break_bulk_charge : 0) + 
											(awbuserdatas[i].cartage_charge ? awbuserdatas[i].cartage_charge : 0) + 
											(awbuserdatas[i].do_charge ? awbuserdatas[i].do_charge : 0) + 
											(awbuserdatas[i].baggage_charge ? awbuserdatas[i].baggage_charge : 0) + 
											(awbuserdatas[i].direct_delivery_charge ? awbuserdatas[i].direct_delivery_charge: 0) + 
											(awbuserdatas[i].misc_charges ? awbuserdatas[i].misc_charges: 0));
										igst_charges.push(
											awbuserdatas[i].igst ? awbuserdatas[i].igst: 0);
										cgst_charges.push(
											awbuserdatas[i].cgst ? awbuserdatas[i].cgst: 0);
										sgst_charges.push(
											awbuserdatas[i].sgst ? awbuserdatas[i].sgst: 0);
										total_charges.push(
											(awbuserdatas[i].collect_fee ? awbuserdatas[i].collect_fee: 0) + 
											(awbuserdatas[i].collect_charge ? awbuserdatas[i].collect_charge: 0) + 
											(awbuserdatas[i].break_bulk_charge ? awbuserdatas[i].break_bulk_charge: 0) + 
											(awbuserdatas[i].cartage_charge ? awbuserdatas[i].cartage_charge: 0) + 
											(awbuserdatas[i].do_charge ? awbuserdatas[i].do_charge: 0) + 
											(awbuserdatas[i].baggage_charge ? awbuserdatas[i].baggage_charge: 0) + 
											(awbuserdatas[i].direct_delivery_charge ? awbuserdatas[i].direct_delivery_charge: 0) + 
											(awbuserdatas[i].misc_charges ? awbuserdatas[i].misc_charges: 0) + 
											(awbuserdatas[i].igst ? awbuserdatas[i].igst: 0) + 
											(awbuserdatas[i].cgst ? awbuserdatas[i].cgst: 0) + 
											(awbuserdatas[i].sgst ? awbuserdatas[i].sgst: 0));
									}
									
									charges_details.invoice_id = awbuserdatas[0].invoice_document;
									charges_details.received_from = awbuserdatas[0].consignee_name;
									charges_details.gstin_of_company = awbuserdatas[0].gstin;
									charges_details.gstin_of_customer = awbuserdatas[0].consignee_gstn;
									charges_details.hsn_code = awbuserdatas[0].hsn_code;
									
									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].gstin.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.state = allgst_state[i].state_name;
										}
									}
									
									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].consignee_gstn.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.pos = allgst_state[i].state_name;
										}
									}
									
									charges_details.awb_nos = awb_nos;
									charges_details.freight_charges_amount_array = freight_charges;
									charges_details.do_other_charges_amount_array = do_other_charges;
									charges_details.igst_charges_amount_array = igst_charges;
									charges_details.cgst_charges_amount_array = cgst_charges;
									charges_details.sgst_charges_amount_array = sgst_charges;
									charges_details.total_charges_amount_array = total_charges;
									
									all_charges_array.push(charges_details);
									
									var awbs = [];
									for (var j = 0; j < awbuserdatas.length; j++)
										awbs.push(awbuserdatas[j].awb_number);

									awbuserdata_array.push(awbs);
									
									callback();
								} else {
									callback('Awb Record not found');
								}
							}
						})
					} else {
						callback('Awb Record not found');
					}
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback(err, null, null, null);
					} else {
						callback(null, invoices, awbuserdata_array);
					}
				});
			},
			function (invoices, awbuserdata_array, callback) {
				Ports.find({
					where: {
						and: [{
								"is_inward_port": true
							},
							{
								iata_code: req.user.iata_code
							}
						]
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
						callback('something went wrong while finding airports', null, null, null);
					} else {
						callback(null, ports, invoices, awbuserdata_array);
					}
				});
			},
			function (ports, invoices, awbuserdata_array, callback) {
				for (var i = 0; i < invoices.length; i++) {
					let multi_awb_total = 0;
					
					//	one blank line before multiple awbs
					if(all_charges_array[i].awb_nos.length > 1) {
						result_json.push({});
					}
					
					for(let j = 0; j < all_charges_array[i].awb_nos.length; j++) {
						
						var singledata = {};
						
						singledata.sr_no = (j == 0) ? (i + 1) : '';
						singledata.comapny_name = sails.config.globals.airlines_name;
						singledata.state = all_charges_array[i].state;
						singledata.gstin_of_company = all_charges_array[i].gstin_of_company;
						singledata.gstin_of_customer = all_charges_array[i].gstin_of_customer;
						singledata.invoice_no = invoices[i].invoice_number;
						singledata.awb_nos = all_charges_array[i].awb_nos[j];
						singledata.date = new Date(invoices[i].invoice_issue_date);
						singledata.value = sails.config.globals.price_formatter(all_charges_array[i].total_charges_amount_array[j] - all_charges_array[i].sgst_charges_amount_array[j] - all_charges_array[i].cgst_charges_amount_array[j] - all_charges_array[i].igst_charges_amount_array[j]);
						singledata.goods_or_service = 'Transport of goods by air';
						singledata.hsn_code = all_charges_array[i].hsn_code;
						singledata.taxbale_value = sails.config.globals.price_formatter(all_charges_array[i].total_charges_amount_array[j] - all_charges_array[i].freight_charges_amount_array[j] - all_charges_array[i].sgst_charges_amount_array[j] - all_charges_array[i].cgst_charges_amount_array[j] - all_charges_array[i].igst_charges_amount_array[j]);
						singledata.igst_perc_of_tax = '';
						singledata.igst = sails.config.globals.price_formatter(all_charges_array[i].igst_charges_amount_array[j]);
						singledata.sgst_perc_of_tax = '';
						singledata.sgst = sails.config.globals.price_formatter(all_charges_array[i].sgst_charges_amount_array[j]);
						singledata.cgst_sgst_perc_of_tax = '';
						singledata.cgst = sails.config.globals.price_formatter(all_charges_array[i].cgst_charges_amount_array[j]);
						singledata.total = sails.config.globals.price_formatter(Math.ceil(all_charges_array[i].total_charges_amount_array[j]));
						singledata.payment_mode = invoices[i].payment_mode;
						if (paymentmode == 'ALL' || paymentmode == 'CHQ' || paymentmode == 'DD' || paymentmode == 'RTGS' || paymentmode == 'UPI') {
							singledata.cheque_no = invoices[i].payment_reference_number;
							singledata.bank_name = (paymentmode == 'RTGS') ? '' : invoices[i].payment_drawn_on;
						} else {
							singledata.cheque_no = '';
							singledata.bank_name = '';
						}
						singledata.pos = (paymentmode == 'RTGS') ? '' : all_charges_array[i].pos;
						singledata.payment_comments = invoices[i].payment_comments;
						
						multi_awb_total += all_charges_array[i].total_charges_amount_array[j];
							
						result_json.push(singledata);
					}
					
					//	one blank line after multiple awbs
					if(all_charges_array[i].awb_nos.length > 1) {
						result_json.push({
							total: sails.config.globals.price_formatter(Math.ceil(multi_awb_total))
						});
					}
				}
				callback(null, ports, invoices, awbuserdata_array);
			}
		], function (err, ports, invoices, awbuserdata_array) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailygstreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');

				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFF00'
							}
						}
					}
				};

				// You can define styles as json object
				const styles_monthly = {
					cellskyblue: {
						fill: {
							fgColor: {
								rgb: '06e2c9'
							}
						}
					}
				};

				const specification = {};
				specification.sr_no = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Sr. No.'
				};
				specification.comapny_name = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Company Name'
				};
				specification.state = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'State'
				};
				specification.gstin_of_company = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'GSTIN of company'
				};
				specification.gstin_of_customer = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'GSTIN of customer'
				};
				specification.invoice_no = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Invoice no.'
				};
				specification.awb_nos = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'AWB no.'
				};
				specification.date = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Date'
				};
				specification.value = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Value'
				};
				specification.goods_or_service = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Goods/Service'
				};
				specification.hsn_code = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'HSN/SAC'
				};
				specification.taxbale_value = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Taxable value'
				};
				specification.igst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.igst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'IGST Amt'
				};
				specification.sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.sgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'SGST Amt'
				};
				specification.cgst_sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: '% of tax'
				};
				specification.cgst = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'CGST Amt'
				};
				specification.total = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Total value'
				};
				specification.payment_mode = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Pymt mode'
				};
				if (paymentmode == 'CHQ' || paymentmode == 'DD' || paymentmode == 'RTGS' || paymentmode == 'UPI') {
					specification.cheque_no = (paymentmode == 'RTGS') ? {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'RTGS details'
					} : {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'Chq/DD No'
					};
					specification.bank_name = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: 'BANK'
					};
				} else {
					specification.cheque_no = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: ''
					};
					specification.bank_name = {
						width: 100,
						headerStyle: styles.cellYellow,
						displayName: ''
					};
				}
				specification.pos = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'POS'
				};
				specification.payment_comments = {
					width: 100,
					headerStyle: styles.cellYellow,
					displayName: 'Remarks'
				};

				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'GSTReport', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('dailygstreport_v2.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatemonthlyreports: function (req, res) {
		var city = req.body.inwardcargo_monthlygstreports_city;
		var date = new Date(Number(req.body.inwardcargo_monthlygstreports_date_input)),
			y = date.getFullYear(),
			m = date.getMonth();
		var from = new Date(y, m, 1).getTime();
		var to = new Date(y, m + 1, 1).getTime();
		var all_charges_array = [];
		var result_json = [];
		var allgst_state = [];
		sails.config.globals.async.waterfall([
			function (callback) {
				Gst.find({
					where: {},
					sort: 'gst_code'
				}, function (err, gsts) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
						callback('error finding gst', null, null, null);
					} else {
						if (gsts && gsts.length > 0) {
							allgst_state = gsts;
							callback(null);
						} else {
							callback('No gst found', null, null, null);
						}
					}
				});
			},
			function (callback) {
				var query = {};
				query.where = {};
				query.where.and = [];
				query.where.and.push({
					invoice_issue_date: {
						'>=': from
					}
				});
				query.where.and.push({
					invoice_issue_date: {
						'<=': to
					}
				}, );
				query.where.and.push({
					invoice_number: {
						endsWith: city
					}
				});
				query.sort = 'invoice_issue_date';
				Invoice.find(query, function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if (invoices && invoices.length > 0) {
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
			function (invoices, callback) {
				var awbuserdata_array = [];
				async.eachSeries(invoices, function (invoice, callback) {
					if (invoice) {
						AwbUserData.find({
							//awb_number : invoice.awbs
							_id: invoice.awb_user_datas
						}, async function (err, awbuserdatas) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
								callback('Awb Record not found');
							} else {
								if (awbuserdatas && awbuserdatas.length > 0) {
									var freight_charges = 0;
									var do_other_charges = 0;
									var igst_charges = 0;
									var cgst_charges = 0;
									var sgst_charges = 0;
									var total_charges = 0;
									var charges_details = {};
									for (var i = 0; i < awbuserdatas.length; i++) {
										freight_charges = freight_charges + awbuserdatas[i].collect_fee + awbuserdatas[i].collect_charge;
										do_other_charges = do_other_charges + awbuserdatas[i].break_bulk_charge + awbuserdatas[i].cartage_charge + awbuserdatas[i].do_charge + awbuserdatas[i].baggage_charge + awbuserdatas[i].direct_delivery_charge + awbuserdatas[i].misc_charges;
										igst_charges = igst_charges + awbuserdatas[i].igst;
										cgst_charges = cgst_charges + awbuserdatas[i].cgst;
										sgst_charges = sgst_charges + awbuserdatas[i].sgst;
										total_charges = freight_charges + do_other_charges + igst_charges + cgst_charges + sgst_charges;
									}
									charges_details.invoice_id = awbuserdatas[0].invoice_document;
									charges_details.received_from = awbuserdatas[0].consignee_name;
									charges_details.gstin_of_company = awbuserdatas[0].gstin;
									charges_details.gstin_of_customer = awbuserdatas[0].consignee_gstn;
									charges_details.consignee_is_sez = awbuserdatas[0].consignee_is_sez ? "Y" : "N";
									charges_details.hsn_code = awbuserdatas[0].hsn_code;
									let stateGstCode = "";
									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].gstin.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.state = allgst_state[i].state_name;
											stateGstCode = gstcode;
										}
									}
									for (var i = 0; i < allgst_state.length; i++) {
										var gstcode = awbuserdatas[0].consignee_gstn.substring(0, 2);
										if (gstcode == allgst_state[i].gst_code) {
											charges_details.pos = gstcode + "-" + allgst_state[i].state_name;
										}
									}
									if(!charges_details.pos) {
										charges_details.pos = stateGstCode + "-" + charges_details.state;
									}
									charges_details.freight_charges_amount_all_awb = freight_charges;
									charges_details.do_other_charges_amount_all_awb = do_other_charges;
									charges_details.igst_charges_amount_all_awb = igst_charges;
									charges_details.cgst_charges_amount_all_awb = cgst_charges;
									charges_details.sgst_charges_amount_all_awb = sgst_charges;
									charges_details.total_charges_amount_all_awb = total_charges;//Math.ceil(total_charges);

									let irn = await IRN.findOne({invoice_number: invoice.invoice_number, type_of_invoice: sails.config.custom.irn_invoice_types.invoice, status: sails.config.custom.irn_job_status.done});

									charges_details.irn = irn ? irn.irn : "";

									all_charges_array.push(charges_details);
									var awbs = [];
									for (var j = 0; j < awbuserdatas.length; j++)
										awbs.push(awbuserdatas[j].awb_number);

									awbuserdata_array.push(awbs);
									callback();
								} else {
									callback('Awb Record not found');
								}
							}
						})
					} else {
						callback('Awb Record not found');
					}
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
						callback(err, null, null, null);
					} else {
						callback(null, invoices, awbuserdata_array);
					}
				});
			},
			function (invoices, awbuserdata_array, callback) {
				Ports.find({
					where: {
						and: [{
								"is_inward_port": true
							},
							{
								iata_code: req.user.iata_code
							}
						]
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
						callback('something went wrong while finding airports', null, null, null);
					} else {
						callback(null, ports, invoices, awbuserdata_array);
					}
				});
			},
			function (ports, invoices, awbuserdata_array, callback) {
				for (var i = 0; i < invoices.length; i++) {
					var singledata = {};
					singledata.sr_no = i + 1;
					singledata.comapny_name = sails.config.globals.airlines_name;
					singledata.state = all_charges_array[i].state;
					singledata.gstin_of_company = (invoices[i].void_on == 0) ? all_charges_array[i].gstin_of_company : '';
					singledata.gstin_of_customer = all_charges_array[i].gstin_of_customer;
					singledata.consignee_is_sez = all_charges_array[i].consignee_is_sez;
					singledata.invoice_no = invoices[i].invoice_number;
					var single_date = new Date(invoices[i].invoice_issue_date);
					singledata.date = '' + single_date.getDate() + '/' + (single_date.getMonth()+1) + '/' + single_date.getFullYear();;
					/*singledata.date = new Date(invoices[i].invoice_issue_date).toLocaleString('en-IN', {
						timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric'
					});*/
					singledata.value = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(all_charges_array[i].do_other_charges_amount_all_awb + all_charges_array[i].freight_charges_amount_all_awb/*all_charges_array[i].total_charges_amount_all_awb - all_charges_array[i].sgst_charges_amount_all_awb - all_charges_array[i].cgst_charges_amount_all_awb - all_charges_array[i].igst_charges_amount_all_awb*/) : 0;
					singledata.goods_or_service = (invoices[i].void_on == 0) ? 'Transport of goods by air' : '';
					singledata.hsn_code = (invoices[i].void_on == 0) ? all_charges_array[i].hsn_code : '';
					//	We should remove freight charges if any since they are not taxable
					singledata.taxbale_value = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(all_charges_array[i].do_other_charges_amount_all_awb/*all_charges_array[i].total_charges_amount_all_awb - all_charges_array[i].freight_charges_amount_all_awb - all_charges_array[i].sgst_charges_amount_all_awb - all_charges_array[i].cgst_charges_amount_all_awb - all_charges_array[i].igst_charges_amount_all_awb*/) : 0;
					singledata.igst_perc_of_tax = (invoices[i].void_on == 0) ? '18' : '';
					singledata.igst = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(all_charges_array[i].igst_charges_amount_all_awb) : '';
					singledata.sgst_perc_of_tax = (invoices[i].void_on == 0) ? '9' : '';
					singledata.sgst = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(all_charges_array[i].sgst_charges_amount_all_awb) : '';
					singledata.cgst_sgst_perc_of_tax = (invoices[i].void_on == 0) ? '9' : '';
					singledata.cgst = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(all_charges_array[i].cgst_charges_amount_all_awb) : '';
					singledata.total = (invoices[i].void_on == 0) ? sails.config.globals.price_formatter(Math.ceil(all_charges_array[i].total_charges_amount_all_awb)) : 0;
					singledata.payment_mode = (invoices[i].void_on == 0) ? invoices[i].payment_mode : 'void';
					singledata.cheque_no = (invoices[i].void_on == 0) ? invoices[i].payment_reference_number : '';
					singledata.bank_name = (invoices[i].void_on == 0) ? invoices[i].payment_drawn_on : '';
					singledata.pos = all_charges_array[i].pos;//(invoices[i].void_on == 0) ? ((invoices[i].payment_mode == 'RTGS') ? '' : all_charges_array[i].pos) : '';
					singledata.reversecharges = (invoices[i].void_on == 0) ? '' : '';
					singledata.provisionalassessment = (invoices[i].void_on == 0) ? '' : '';
					singledata.gstin_ecommerce = (invoices[i].void_on == 0) ? '' : '';
					singledata.payment_comments = invoices[i].payment_comments;

					singledata.irn = all_charges_array[i].irn;

					result_json.push(singledata);
				}
				callback(null, ports, invoices, awbuserdata_array);
			},
			//	Getting DCMs
			function (ports, invoices, awbuserdata_array, callback) {
				var query = {};
				query.where = {};
				query.where.and = [{void_on: 0}];
				query.where.and.push({
					dcm_issue_date: {
						'>=': from
					}
				});
				query.where.and.push({
					dcm_issue_date: {
						'<=': to
					}
				}, );
				query.where.and.push({
					dcm_number: {
						endsWith: city
					}
				});
				query.sort = 'dcm_issue_date';
				DCM.find(query, function (err, dcms) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
						callback(null, ports, invoices, awbuserdata_array);
					} else {
						if (dcms && dcms.length > 0) {
							async.eachSeries(dcms, function (dcm, cb_each) {
								async.waterfall([
									function (cb_wf) {
										Invoice.findOne({
											_id: dcm.base_invoice_id
										}, function (err_inv, invoice) {
											if (err_inv) {
												sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err_inv);
												cb_wf(err_inv, null, null);
											} else {
												cb_wf(null, invoice);
											}
										});
									},
									function (invoice, cb_wf) {
										AwbUserData.findOne({
											_id: invoice.awb_user_datas[0]
										}, function (err_awbud, awbuserdata) {
											if (err_awbud) {
												sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err_awbud);
												cb_wf(err_awbud, null, null);
											} else {
												cb_wf(null, invoice, awbuserdata);
											}
										})
									}
								], async function (err_wf, invoice, awbuserdata) {
									if (err_wf) {
										sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err_wf);
										cb_each(err_wf);
									} else {
										let number_start_from = result_json.length;
										//for(let i = 0; i < dcms.length; i++) {
										var singledata = {};
										singledata.sr_no = number_start_from + 1;
										singledata.comapny_name = sails.config.globals.airlines_name;
										for (let j = 0; j < allgst_state.length; j++) {
											var gstcode = awbuserdata.gstin.substring(0, 2);
											if (gstcode == allgst_state[j].gst_code) {
												singledata.state = allgst_state[j].state_name;
												break;
											}
										}
										singledata.gstin_of_company = awbuserdata.gstin;
										singledata.gstin_of_customer = awbuserdata.consignee_gstn;
										singledata.consignee_is_sez = awbuserdata.consignee_is_sez;
										singledata.invoice_no = dcm.dcm_number;
										let single_date = new Date(dcm.dcm_issue_date);
										singledata.date = '' + single_date.getDate() + '/' + (single_date.getMonth()+1) + '/' + single_date.getFullYear();;
										var value = 0;
										for (let j = 0; j < dcm.correct_amount.length; j++) {
											value += dcm.correct_amount[j];
										}
										for (let j = 0; j < dcm.incorrect_amount.length; j++) {
											value -= dcm.incorrect_amount[j];
										}
										singledata.value = value;
										singledata.goods_or_service = 'Transport of Goods by air';
										singledata.hsn_code = awbuserdata.hsn_code;
										singledata.taxbale_value = value;
										singledata.igst_perc_of_tax = '18';
										singledata.igst = sails.config.globals.price_formatter(dcm.igst - dcm.incorrect_igst);
										singledata.sgst_perc_of_tax = '9';
										singledata.sgst = sails.config.globals.price_formatter(dcm.sgst - dcm.incorrect_sgst);
										singledata.cgst_sgst_perc_of_tax = '9';
										singledata.cgst = sails.config.globals.price_formatter(dcm.cgst - dcm.incorrect_cgst);
										singledata.total = ((dcm.revised_total < 0) ? Math.floor(dcm.revised_total) : Math.ceil(dcm.revised_total)) ;
										singledata.payment_mode = '';
										singledata.cheque_no = '';
										singledata.bank_name = '';
										for (let j = 0; j < allgst_state.length; j++) {
											var gstcode = awbuserdata.consignee_gstn.substring(0, 2);
											if (gstcode == allgst_state[j].gst_code) {
												singledata.pos = allgst_state[j].state_name;
											}
										}
										singledata.reversecharges = '';
										singledata.provisionalassessment = '';
										singledata.gstin_ecommerce = '';
										singledata.payment_comments = '';

										let irn = await IRN.findOne({invoice_number: dcm.dcm_number, type_of_invoice: sails.config.custom.irn_invoice_types.dcm, status: sails.config.custom.irn_job_status.done});

										singledata.irn = irn ? irn.irn : "";

										result_json.push(singledata);
										//}
										cb_each(null);
									}
								});
							}, function (e_each) {
								if (e_each) {
									sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + e_each);
									callback('Error occured while finding details of DCM in monthly report', null, null, null);
								} else {
									callback(null, ports, invoices, awbuserdata_array);
								}
							});
						} else {
							callback(null, ports, invoices, awbuserdata_array);
						}
					}
				});
			}
		], function (err, ports, invoices, awbuserdata_array) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatemonthlyreports - post)' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				const excel = require('node-excel-export');
				const styles = {
					cellYellow: {
						fill: {
							fgColor: {
								rgb: 'FFFFFF00'
							}
						}
					}
				};

				// You can define styles as json object
				const styles_monthly = {
					cellskyblue: {
						fill: {
							fgColor: {
								rgb: '06e2c9'
							}
						},
						alignment: {
							wrapText: true
						}
					}
				};

				const specification = {};
				specification.sr_no = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Sr. No.'
				};
				specification.comapny_name = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Company Name'
				};
				specification.state = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'State'
				};
				specification.gstin_of_company = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'GSTIN of company'
				};
				specification.gstin_of_customer = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'GSTIN of customer'
				};
				specification.consignee_is_sez = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: "Is SEZ"
				};
				specification.invoice_no = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Invoice no.'
				};
				specification.date = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Date'
				};
				specification.value = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Value'
				};
				specification.goods_or_service = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Goods/Service'
				};
				specification.hsn_code = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'HSN/SAC'
				};
				specification.taxbale_value = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Taxable value'
				};
				specification.igst_perc_of_tax = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'IGST rate in %'
				};
				specification.igst = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'IGST Amt'
				};
				specification.sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'SGST rate in %'
				};
				specification.sgst = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'SGST Amt'
				};
				specification.cgst_sgst_perc_of_tax = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'CGST rate in %'
				};
				specification.cgst = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'CGST Amt'
				};
				specification.total = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Total value'
				};
				specification.payment_mode = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Pymt mode'
				};
				specification.cheque_no = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Chq/DD No'
				};
				specification.bank_name = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'BANK'
				};
				specification.pos = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'POS if different from the location of the reipient'
				};
				specification.reversecharges = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Indicate if supply attracts reverse charge'
				}
				specification.provisionalassessment = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Tax on this Invoice is paid under provisional assessment (Checkbox)'
				}
				specification.gstin_ecommerce = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'GSTIN of e-commerce operator(if applicable)'
				}
				specification.payment_comments = {
					width: 100,
					headerStyle: styles_monthly.cellskyblue,
					displayName: 'Remarks'
				}
				if(sails.config.custom.e_invoice_supported) {
					specification.irn = {
						width: 300,
						headerStyle: styles_monthly.cellskyblue,
						displayName: 'IRN'
					}
				}
				// Create the excel report.
				// This function will return Buffer
				const report = excel.buildExport(
					[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
						{
							name: 'GSTReport', // <- Specify sheet name (optional)
							specification: specification, // <- Report specification
							data: result_json // <-- Report data
						}
					]
				);

				res.attachment('monthlyreport.xlsx'); // This is sails.js specific (in general you need to set headers)
				return res.send(report);
			}
		});
	},
	generatedailycheckcashdepositstatement: function (req, res) {
		var challan_no = req.body.inwardcargo_dailycheckcashdepositstatemnt_challan_no_input;
		var city = req.body.inwardcargo_dailycheckcashdepositstatemnt_city;
		var paymentmode = req.body.inwardcargo_dailycheckcashdepositstatemnt_paymentmode;
		var from = new Date(Date.parse(req.body.inwardcargo_dailycheckcashdepositstatemnt_from_date_input)).setHours(0, 0, 0, 0);
		var to = new Date(Date.parse(req.body.inwardcargo_dailycheckcashdepositstatemnt_to_date_input)).setHours(23, 59, 59, 999);
		var query = {};
		query.where = {};
		query.where.and = [];
		query.where.and.push({
			payment_received_date: {
				'>=': from
			}
		});
		query.where.and.push({
			payment_received_date: {
				'<=': to
			}
		}, );
		query.where.and.push({
			invoice_number: {
				endsWith: city
			}
		});
		//query.where.and.push({payment_mode: paymentmode});
		query.where.and.push((paymentmode == 'CHQ') ? {
			payment_mode: { in: ['CHQ', 'DD']
			}
		} : {
			payment_mode: paymentmode
		});
		query.where.and.push({
			void_on: 0
		});
		query.sort = 'payment_received_date';

		Invoice.find(query, async function (err, invoices) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
				return res.view('pages/imlost', {
					error: 'something happen while finding invoice'
				});
			} else {
				if (invoices.length > 0) {
					//let awb_user_data_ids = invoices.map((invoice)=>invoice.awb_user_datas);
					//let awb_user_datas = await AwbUserData.find({id: _.flattenDeep(awb_user_data_ids)});
					let now_date = new Date();
					if(challan_no) {
						let city_constant = await CityConstants.findOne({
							and : [
								{ iata_code: city},	//	Simple JUGAD
								{ expires_on: { '>': now_date.getTime()}},
								{ effective_from: { '<=': now_date.getTime()}}
							]
						});
						
						let invoice_ids = invoices.map((invoice)=>invoice.id);
						
						let year = now_date.getYear();
						let challan = await Challan.create({
							challan_no: challan_no,
							unique_challan: (now_date.getMonth() <= 2 ? '' + (year-1) % 100 + '_' + year % 100 : '' + year % 100 + '_' + (year + 1) % 100) + '_' + city + '_' + city_constant.bank_ifsc + '_' + challan_no,
							city_iata_code: city,
							challan_for: paymentmode,
							bank_ifsc: city_constant.bank_ifsc,
							invoices: invoice_ids,
							created_by: req.user.username
						}).fetch().catch((err)=>{
							return res.view('pages/imlost', {
								error: 'Challan Number is not unique'
							});
						});
						
						if(challan) {
							invoices.forEach(async function(invoice) {
								let challans = invoice.challans ? invoice.challans : [];
								challans.push(challan.id);
								await Invoice.update({id: invoice.id}).set({challans: challans});
							});
						} else {
							return;	//	returning from here because it will be clear that the challan is not formed and the view change has occured inside the catch of Challan.create().
						}
					}

					return res.view('pages/cashchqstatement', {
						invoiceslistdetails: invoices,
						challan_no: challan_no
					});
				} else {
					return res.view('pages/imlost', {
						error: 'No Invoices found'
					});
				}
			}
		});
	},
	invoicelist: function (req, res) {
		var invoice_fromdate = Date.parse(req.body.inwardcargo_invoicelist_fromdate_input);
		var invoice_todate = Date.parse(req.body.inwardcargo_invoicelist_todate_input) + 1 * 24 * 60 * 60 * 1000;
		var invoice_city = req.body.inwardcargo_invoicelist_city_input;
		sails.config.globals.async.waterfall([
			function (callback) {
				Invoice.find({
					where: {
						and: [{
								invoice_issue_date: {
									'>=': invoice_fromdate
								}
							},
							{
								invoice_issue_date: {
									'<=': invoice_todate
								}
							},
							{
								invoice_number: {
									endsWith: invoice_city
								}
							}
						]
					},
					sort: 'invoice_issue_date'
				}, function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
						callback('error finding invoices', null, null, null);
					} else {
						if (invoices.length > 0) {
							callback(null, invoices);
						} else {
							callback('No Invoices found', null, null, null);
						}
					}
				});
			},
			function (invoices, callback) {
				var awbuserdata_array = [];
				async.eachSeries(invoices, function (invoice, callback) {
					if (invoice) {
						AwbUserData.find({
							//awb_number : invoice.awbs
							_id: invoice.awb_user_datas
						}, function (err, awbuserdatas) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
								callback('Awb Record not found');
							} else {
								if (awbuserdatas) {
									awbuserdata_array.push(awbuserdatas);
									callback();
								} else {
									callback('Awb Record not found');
								}
							}
						})
					} else {
						callback('Awb Record not found');
					}
				}, function (err) {
					// if any of the file processing produced an error, err would equal that error
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
						callback(err, null, null, null);
					} else {
						callback(null, invoices, awbuserdata_array);
					}
				});
			},
			function (invoices, awbuserdata_array, callback) {
				Ports.find({
					where: {
						"is_inward_port": true
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
						callback('something went wrong while finding airports', null, null, null);
					} else {
						callback(null, ports, invoices, awbuserdata_array);
					}
				});
			}
		], function (err, ports, invoices, awbuserdata_array) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (generatedailycheckcashdepositstatement - post)' + err);
				return res.view('pages/imlost', {
					error: err
				});
			} else {
				return res.view('pages/invoicelist', {
					invoicelist: invoices,
					awbuserdatalist: awbuserdata_array,
					cityCode: invoice_city,
					airportlistdetails: ports
				});
			}
		});
	},
	
	getconsigneelistreport: async function(req, res) {
		let query = {city_iata_code: req.body.inwardcargo_consignee_list_city};
		if(req.body.inwardcargo_consignee_list_customertype != 'All')
			query.type_of_customer = req.body.inwardcargo_consignee_list_customertype;
		let consignees = await Address.find(query);

		consignees = consignees.map((consignee)=>{
			if(!consignee.gst_exemption_till_date)
				consignee.gst_exemption_till_date = '';
			else
				consignee.gst_exemption_till_date = sails.config.custom.getReadableDate(consignee.gst_exemption_till_date);
			
			return consignee;
		});

		const excel = require('node-excel-export');

		// You can define styles as json object
		const styles = {
			cellYellow: {
				fill: {
					fgColor: {
						rgb: 'FFFFFF00'
					}
				},
				alignment: {
					wrapText: true
				}
			},
			each_data_cell: {
				alignment: {
					wrapText: true
				}
			},
			each_data_cell_wo_wraptext: {
				alignment: {
					wrapText: false
				}
			},
		};
		
		const specification = {
			city_iata_code: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Station'},
			type_of_customer: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Customer Type'},
			name: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Name'},
			address: {width: 200, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell_wo_wraptext, displayName: 'Address'},
			email: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Email'},
			pincode: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Pincode'},
			phone: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Phone'},
			state: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'State'},
			gstin: {width: 150, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'GSTIN'},
			hsn_code: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'HSN Code'},
			tds_applicable: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'TDS'},
			is_sez: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'SEZ'},
			is_enable_consignee: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Active'},
			gst_exemption: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'GST Exempted'},
			gst_exemption_till_date: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'GST Exemption Till'},
			credit_period: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Credit Period'},
		}

		const report = excel.buildExport(
			[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
				{
					name: req.body.inwardcargo_consignee_list_city + '_Consignee_list', // <- Specify sheet name (optional)
					specification: specification, // <- Report specification
					data: consignees // <-- Report data
				}
			]
		);

		res.attachment(req.body.inwardcargo_consignee_list_city + '_consignee_list.xlsx'); // This is sails.js specific (in general you need to set headers)
		return res.send(report);
	},
		
	getpendingdocumentsreport: async function(req, res) {
		//	AWB Number
		//	IGM number
		//	Date Range (All / Direct / Agent)
		
		let station = req.body.inwardcargo_dailychallanreports_city;
		let awbs = [];
		let document_type = req.body.inwardcargo_all_pending_documents_document_type;
		
		switch(req.body.inwardcargo_all_pending_documents_option) {
			case 'inwardcargo_all_pending_documents_option_date_range': {
				let startDate = new Date(req.body.inwardcargo_all_pending_documents_option_date_range_from);
				let endDate = new Date(req.body.inwardcargo_all_pending_documents_option_date_range_to);
				
				awbs = await Awb.find({
					where: {
						and: [
							{awb_city: station},
							{createdAt: {'>=': startDate.getTime()}},
							{createdAt: {'<=': endDate.getTime()}}
						]
					},
					select: ['awb_number', 'origin', 'destination']
				});
			}
			break;

			case 'inwardcargo_all_pending_documents_option_awb_number': {
				awbs = await Awb.find({awb_number: req.body.inwardcargo_all_pending_documents_awb_number});
				
			}
			break;

			case 'inwardcargo_all_pending_documents_option_igm_number': {
				awbs = await PartAwb.find({igm_number: req.body.inwardcargo_all_pending_documents_igm_number});
			}
			break;
			
			default: {
				return res.view('pages/imlost', {
					error: 'Cannot get you results for your selections'
				});
			}
			break;
		}
		
		let report = [];

		sails.config.globals.async.eachSeries(awbs, async function(awb, each_cb) {
			let result = {};

			let awbuserdata = await AwbUserData.findOne({
				where: {
					and: [
						{awb_number: awb.awb_number, void_on: 0}
					]
				},
				select: ['consignee_type', 'consignee_name', 'invoice_document']
			});
			//result.invoice = (await AwbUserData.count({awb_number: awb.awb_number, void_on: 0, invoice_document: {'!=': ''}}) > 0) ? 'YES' : 'NO';
			result.invoice = (awbuserdata.invoice_document != '') ? 'YES' : 'NO'
			if(result.invoice == 'YES') {
				result.do = 'YES';
			} else {
				result.do = ((await Do.count({awb_number: awb.awb_number, void_on: 0}) > 0) ? 'YES' : 'NO');
			}
			result.can = (result.do == 'YES') ? 'YES' : ((await Can.count({awb_number: awb.awb_number, void_on: 0}) > 0) ? 'YES' : 'NO');

			result.awb_number = awb.awb_number;
			//result.station = station;
			
			result.origin = awb.origin;
			result.destination = awb.destination;
			result.consignee_type = awbuserdata.consignee_type;
			result.consignee_name = awbuserdata.consignee_name;
			
			switch(document_type) {
				case 'All':
				case undefined:
					report.push(result);
					break;
				case 'can':
					if(result.can == false)
						report.push(result);
					break;
				case 'do':
					if(result.do == false)
						report.push(result);
					break;
				case 'invoice':
					if(result.invoice == false)
						report.push(result);
					break;
			}

			each_cb();
			/*sails.config.globals.async.parallel({
				can: async function(parallel_cb) {
					let can_count = await Can.count({awb_number: awb.awb_number, void_on: 0});
					parallel_cb(null, (can_count > 0) ? 'YES' : 'NO');
				},
				do: async function(parallel_cb) {
					let do_count = await Do.count({awb_number: awb.awb_number, void_on: 0});
					parallel_cb(null, (do_count > 0) ? 'YES' : 'NO');
				},
				invoice: async function(parallel_cb) {
					let awb_user_data = await AwbUserData.count({awb_number: awb.awb_number, void_on: 0, invoice_document: {'!=': ''}});
					parallel_cb(null, (awb_user_data > 0) ? 'YES' : 'NO');
				}
			}, async function(err, result) {
				if(err) {
					
				} else {
					result.awb_number = awb.awb_number;
					//result.station = station;
					
					let awbuserdata = await AwbUserData.findOne({
						where: {
							and: [
								{awb_number: awb.awb_number, void_on: 0}
							]
						},
						select: ['consignee_type', 'consignee_name']
					});
					
					result.origin = awb.origin;
					result.destination = awb.destination;
					result.consignee_type = awbuserdata.consignee_type;
					result.consignee_name = awbuserdata.consignee_name;
					
					switch(document_type) {
						case 'All':
						case undefined:
							report.push(result);
							break;
						case 'can':
							if(result.can == false)
								report.push(result);
							break;
						case 'do':
							if(result.do == false)
								report.push(result);
							break;
						case 'invoice':
							if(result.invoice == false)
								report.push(result);
							break;
					}
				}
				each_cb();
			});*/
		}, function(err) {
			const excel = require('node-excel-export');

			// You can define styles as json object
			const styles = {
				cellYellow: {
					fill: {
						fgColor: {
							rgb: 'FFFFFF00'
						}
					},
					alignment: {
						wrapText: true
					}
				},
				each_data_cell: {
					alignment: {
						wrapText: true
					}
				},
				each_data_cell_wo_wraptext: {
					alignment: {
						wrapText: false
					}
				},
			};

			const specification = {
				//station: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Station'},
				origin: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Origin'},
				destination: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Destination'},
				awb_number: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'AWB No.'},
				consignee_name: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Consignee Name'},
				consignee_type: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Consignee Type'},
				can: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'CAN issued'},
				do: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'DO issued'},
				invoice: {width: 100, headerStyle: styles.cellYellow, cellStyle: styles.each_data_cell, displayName: 'Invoice issued'},
				
			}

			const report_excel = excel.buildExport(
				[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
					{
						name: station + '_pending_list', // <- Specify sheet name (optional)
						specification: specification, // <- Report specification
						data: report // <-- Report data
					}
				]
			);

			res.attachment(station + '_pending_list.xlsx'); // This is sails.js specific (in general you need to set headers)
			return res.send(report_excel);
		});
	},
		
	getxls: async function (req, res) {
		const excel = require('node-excel-export');

		//	added code here
		let c = []; /*await Address.find({select: ['city_iata_code', 'name', 'address', 'state', 'pincode', 'email']});
		let x = 0;
		for(let i = 0; i < c.length; i++) {
			if(c[i].address.length > 200) {
				console.log('' + c[i].address.length, c[i].address);
			}
			let splits = c[i].address.split(',');
			let index = 0;
			let addr1 = '';
			for(let j = 0; j < splits.length; j++) {
				let old = addr1;
				addr1 += splits[j] + ',';
				if(addr1.length > 100) {
					addr1 = old;
					break;
				}
			}
			c[i].addr1 = addr1;
			c[i].addr2 = c[i].address.substr(addr1.length);
		}*/

		//	added code till here

		// You can define styles as json object
		const styles = {
			cellYellow: {
				fill: {
					fgColor: {
						rgb: 'FFFFFF00'
					}
				},
				alignment: {
					//wrapText: true
				}
			},
			each_data_cell: {
				alignment: {
					//wrapText: true
				}
			}
		};

		const specification = {
			id: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'id'
			},
			city_iata_code: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'city_iata_code'
			},
			name: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'name'
			},
			address: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'address'
			},
			state: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'state'
			},
			pincode: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'pincode'
			},
			email: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'email'
			},
			addr1: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'addr1'
			},
			addr2: {
				width: 100,
				headerStyle: styles.cellYellow,
				cellStyle: styles.each_data_cell,
				displayName: 'addr2'
			}
		}

		const dataset = [{
				sr_no: 1,
				date: '14/09/2018',
				freight_charges: 100,
				do_charges: 200,
				igst: 300,
				sgst: 400,
				cgst: 500,
				total: 1500,
				received_from: 'Naval',
				particulars: '12555555555',
			},
			{
				sr_no: 2,
				date: '15/09/2018',
				freight_charges: 101,
				do_charges: 202,
				igst: 303,
				sgst: 404,
				cgst: 505,
				total: 1515,
				received_from: 'Amul',
				particulars: '1252525252525,1252525252525,1252525252525',
			}
		];


		// Create the excel report.
		// This function will return Buffer
		const report = excel.buildExport(
			[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
				{
					name: 'Report', // <- Specify sheet name (optional)
					specification: specification, // <- Report specification
					data: c // <-- Report data
				},
				{
					name: 'Report1', // <- Specify sheet name (optional)
					specification: specification, // <- Report specification
					data: c // <-- Report data
				}
			]
		);

		res.attachment('address.xlsx'); // This is sails.js specific (in general you need to set headers)
		return res.send(report);
	},
		
};
