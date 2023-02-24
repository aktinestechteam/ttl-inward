/**
 * ConstantsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	// function to add constants ,update constants
	constants: function(req, res) {
		var id = req.body.inwardcargo_constants_id;
		var constantsCompanyRegisteredAddress 	= req.body.inwardcargo_constants_list_company_registered_address_textarea;
		var constantsCompanyBankIfsc	 		= req.body.inwardcargo_constants_list_company_bank_ifsc_input;
		var constantsCompanyBankAddress 		= req.body.inwardcargo_constants_list_company_bank_address_textarea;
		var constantsCargoDeliveryAddress 		= req.body.inwardcargo_constants_list_cargo_delivery_address_textarea;
		var constantsCompanyCustomAddress 		= req.body.inwardcargo_constants_list_company_customs_address_textarea;
		var constantsGstin 						= req.body.inwardcargo_constants_list_gstin_input;
		var constantsHsnCode 					= req.body.inwardcargo_constants_list_hsncode_input;
		var constantsIgst 						= req.body.inwardcargo_constants_list_igst_input;
		var constantsCgst 						= req.body.inwardcargo_constants_list_cgst_input;
		var constantsSgst 						= req.body.inwardcargo_constants_list_sgst_input;
		var constantsCollectFessInPerc 			= req.body.inwardcargo_constants_list_collect_fees_in_perc_input;
		var constantsMinimumCollectFeesUsd 		= req.body.inwardcargo_constants_list_minimum_collect_fees_usd_input;
		var constantsDeliveryOrderCharge 		= req.body.inwardcargo_constants_list_delivery_order_charge_input;
		var constantsDeliveryOrderBaggageCharge = req.body.inwardcargo_constants_list_delivery_order_baggage_charge_input;
		var constantsDirectDeliveryCharge 		= req.body.inwardcargo_constants_list_direct_delivery_charge_input;
		var constantsBreakBulkCharge 			= req.body.inwardcargo_constants_list_break_bulk_charge_input;
		var constantsMiscellaneousCharge 		= req.body.inwardcargo_constants_list_miscellaneous_charge_input;
		var constantsMinimumCartageWeight 		= req.body.inwardcargo_constants_list_minimum_cartage_weight_input;
		var constantsMinimumCartageCharge 		= req.body.inwardcargo_constants_list_minimum_cartage_charge_input;
		var constantsCartageChargePerKg 		= req.body.inwardcargo_constants_list_cartage_charge_per_kg_input;
		var constantsSignatory 					= req.body.inwardcargo_constants_list_signatory_input;
		var constantsDesignation 				= req.body.inwardcargo_constants_list_designation_input;
		var constantsCanFront 					= JSON.parse(req.body.inwardcargo_constants_list_canfront_textarea);
		var constantsCanBack 					= JSON.parse(req.body.inwardcargo_constants_list_canback_textarea);
		var constantsCity 						= req.body.inwardcargo_constants_list_city_input;
		var constantsEffectiveFrom 				= req.body.inwardcargo_constants_list_effectivedate_type_select;

		var constantsGstBudgetCode = req.body.inwardcargo_constants_list_budget_code_input;
		var constantsGstBudgetAccount = req.body.inwardcargo_constants_list_gst_budget_account_input;
		var constantsApprovedBy = req.body.inwardcargo_constants_list_chqreq_approved_by_input;
		var constantsApproverTitle = req.body.inwardcargo_constants_list_chqreq_approved_by_title_input;
		var constantsApproverEmail = req.body.inwardcargo_constants_list_chqreq_approved_by_email_input;
		var constantsIntimationEmail = req.body.inwardcargo_constants_dcm_email_input;
		var constantsLineManagerEmail = req.body.inwardcargo_constants_linemanager_email_input;
		var constantsApprovalManagerEmail = req.body.inwardcargo_constants_approvalmanager_email_input;

		if (constantsCity == undefined || constantsCity == null || constantsCity == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'City Cannot be blank');
			return res.send({error: 'City Cannot be blank', error_code:'ERR_CON_CITY_BLANK'});
		} else if (constantsMinimumCollectFeesUsd == undefined || constantsMinimumCollectFeesUsd == null || constantsMinimumCollectFeesUsd == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Minimum Collect Fees Cannot be blank');
			return res.send({error: 'Minimum Collect Fees Cannot be blank', error_code:'ERR_CON_MIN_COLCT_FEE_BLANK'});
		} else if (constantsCollectFessInPerc == undefined || constantsCollectFessInPerc == null || constantsCollectFessInPerc == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Collect Fees in Percentage Cannot be blank');
			return res.send({error: 'Collect Fees in Percentage Cannot be blank', error_code:'ERR_CON_COLCT_FEE_IN_PERC_BLANK'});
		} else if (constantsDeliveryOrderCharge == undefined || constantsDeliveryOrderCharge == null || constantsDeliveryOrderCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Delivery Order Charge Cannot be blank');
			return res.send({error: 'Delivery Order Charge Cannot be blank', error_code:'ERR_CON_DELVR_ORDER_CHARGE_BLANK'});
		}  else if (constantsDeliveryOrderBaggageCharge == undefined || constantsDeliveryOrderBaggageCharge == null || constantsDeliveryOrderBaggageCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Delivery Order Baggage Charge Cannot be blank');
			return res.send({error: 'Delivery Order Baggage Charge Cannot be blank', error_code:'ERR_CON_DELVR_ORDER_BAGG_CHARGE_BLANK'});
		}  else if (constantsDirectDeliveryCharge == undefined || constantsDirectDeliveryCharge == null || constantsDirectDeliveryCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Direct Delivery Charge Cannot be blank');
			return res.send({error: 'Direct Delivery Charge Cannot be blank', error_code:'ERR_CON_DIRECT_DELVR_CHARGE_BLANK'});
		} else if (constantsMinimumCartageCharge == undefined || constantsMinimumCartageCharge == null || constantsMinimumCartageCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Minimum Cartage Charge Cannot be blank');
			return res.send({error: 'Minimum Cartage Charge Cannot be blank', error_code:'ERR_CON_MIN_CARTGE_CHARGE_BLANK'});
		} else if (constantsMinimumCartageWeight == undefined || constantsMinimumCartageWeight == null || constantsMinimumCartageWeight == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Minimum Cartage Weight Cannot be blank');
			return res.send({error: 'Minimum Cartage Weight Cannot be blank', error_code:'ERR_CON_MIN_CARTGE_WEIGHT_BLANK'});
		} else if (constantsCartageChargePerKg == undefined || constantsCartageChargePerKg == null || constantsCartageChargePerKg == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Cartage Charge Per KG Cannot be blank');
			return res.send({error: 'Cartage Charge Per KG Cannot be blank', error_code:'ERR_CON_CARTGE_CHARGE_PER_KG_BLANK'});
		} else if (constantsMiscellaneousCharge == undefined || constantsMiscellaneousCharge == null || constantsMiscellaneousCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Miscellaneous Charge Cannot be blank');
			return res.send({error: 'Miscellaneous Charge Cannot be blank', error_code:'ERR_CON_MISCE_CARTGE_CHARGE_BLANK'});
		} else if (constantsBreakBulkCharge == undefined || constantsBreakBulkCharge == null || constantsBreakBulkCharge == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Break Bulk Charge Cannot be blank');
			return res.send({error: 'Break Bulk Charge Cannot be blank', error_code:'ERR_CON_BREAK_BULK_CHARGE_BLANK'});
		} else if (constantsIgst == undefined || constantsIgst == null || constantsIgst == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Igst Cannot be blank');
			return res.send({error: 'Igst Cannot be blank', error_code:'ERR_CON_IGST_BLANK'});
		}else if (constantsCgst == undefined || constantsCgst == null || constantsCgst == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Cgst Cannot be blank');
			return res.send({error: 'Cgst Cannot be blank', error_code:'ERR_CON_CGST_BLANK'});
		}else if (constantsSgst == undefined || constantsSgst == null || constantsSgst == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Sgst Cannot be blank');
			return res.send({error: 'Sgst Cannot be blank', error_code:'ERR_CON_SGST_BLANK'});
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (constants - post) Consignee all validation passed');
			if(id && (!constantsEffectiveFrom)) {
				CityConstants.update({id: id}, {
					bank_ifsc:						constantsCompanyBankIfsc,
					bank_address:					constantsCompanyBankAddress,
					delivery_address:				constantsCargoDeliveryAddress,
					customs_address:				constantsCompanyCustomAddress,
					registered_address:				constantsCompanyRegisteredAddress,
					gstin_number:					constantsGstin,
					hsn:							constantsHsnCode,
					igst_percentage:				constantsIgst,
					cgst_percentage:				constantsCgst,
					sgst_percentage:				constantsSgst,
					collect_fees_percentage:		constantsCollectFessInPerc,
					collect_fees_min_usd:			constantsMinimumCollectFeesUsd,
					delivery_order_charge:			constantsDeliveryOrderCharge,
					delivery_order_charge_baggage:	constantsDeliveryOrderBaggageCharge,
					direct_delivery_charges:		constantsDirectDeliveryCharge,
					break_bulk_charges:				constantsBreakBulkCharge,
					miscellaneous_charges:			constantsMiscellaneousCharge,
					cartage_charge_min_weight:		constantsMinimumCartageWeight,
					cartage_charge_min:				constantsMinimumCartageCharge,
					cartage_charge_per_kg:			constantsCartageChargePerKg,
					signatory:						constantsSignatory,
					designation:					constantsDesignation,
					can_front:						constantsCanFront,
					can_back:						constantsCanBack,
					iata_code:						constantsCity,
					// gst_budget_code:				constantsGstBudgetCode,
					// gst_budget_account:				constantsGstBudgetAccount,
					// approved_by:					constantsApprovedBy,
					// approver_title:					constantsApproverTitle,
					// approver_email:					constantsApproverEmail,
					intimation_email:				constantsIntimationEmail,
					line_manager_email:				constantsLineManagerEmail,
					approval_manager_email:			constantsApprovalManagerEmail
				}).fetch().exec(function(err, updatedConstants){
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + err);
						return res.send({error: 'Something Happens During Updating Or Inserting'});
					} else {
						if(updatedConstants) {
							sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (constants - post) Constants updated successfully');
							return res.send({value: updatedConstants});
						} else {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post) ' + 'Constants may be undefined');
							return res.send({error: 'Constants may be undefined'});
						}
					}
				});
			} else {
				CityConstants.findOrCreate({iata_code: constantsCity, expires_on: sails.config.globals.expires_at_infinity}, {
					bank_ifsc:						constantsCompanyBankIfsc,
					bank_address:					constantsCompanyBankAddress,
					delivery_address:				constantsCargoDeliveryAddress,
					customs_address:				constantsCompanyCustomAddress,
					registered_address:				constantsCompanyRegisteredAddress,
					gstin_number:					constantsGstin,
					hsn:							constantsHsnCode,
					igst_percentage:				constantsIgst,
					cgst_percentage:				constantsCgst,
					sgst_percentage:				constantsSgst,
					collect_fees_percentage:		constantsCollectFessInPerc,
					collect_fees_min_usd:			constantsMinimumCollectFeesUsd,
					delivery_order_charge:			constantsDeliveryOrderCharge,
					delivery_order_charge_baggage:	constantsDeliveryOrderBaggageCharge,
					direct_delivery_charges:		constantsDirectDeliveryCharge,
					break_bulk_charges:				constantsBreakBulkCharge,
					miscellaneous_charges:			constantsMiscellaneousCharge,
					cartage_charge_min_weight:		constantsMinimumCartageWeight,
					cartage_charge_min:				constantsMinimumCartageCharge,
					cartage_charge_per_kg:			constantsCartageChargePerKg,
					signatory:						constantsSignatory,
					designation:					constantsDesignation,
					can_front:						constantsCanFront,
					can_back:						constantsCanBack,
					iata_code:						constantsCity,
					effective_from: 				constantsEffectiveFrom,
					// gst_budget_code:				constantsGstBudgetCode,
					// gst_budget_account:				constantsGstBudgetAccount,
					// approved_by:					constantsApprovedBy,
					// approver_title:					constantsApproverTitle,
					// approver_email:					constantsApproverEmail,
					intimation_email:				constantsIntimationEmail,
					line_manager_email:				constantsLineManagerEmail,
					approval_manager_email:			constantsApprovalManagerEmail
				}).exec(async(err, constants, wasCreated)=> {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + err);
						return res.send(err);
					} else {
						if(wasCreated) {
							if (err) {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + err);
								return res.send({error: 'Something Happend During Creating Record'});
							} else {
								sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (constants - post) create Constants');
								return res.send({value: constants});
							}
						} else {
							if (id) {
								CityConstants.update({iata_code: constantsCity, expires_on: sails.config.globals.expires_at_infinity}, {expires_on: constantsEffectiveFrom - 1000}).fetch().exec(function(err, updatedConstants){
									if (err) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post) ' + err);
										return res.send({error: 'Something Happens During Updating Or Inserting'});
									} else {
										sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (constants - post) Constants Updated');
										var currentDateTs = new Date().getTime();
										if (currentDateTs > constantsEffectiveFrom) {
											sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + 'Current Date cannot be greater than effective from');
											return res.send({error: 'Current Date cannot be greater than effective from', error_code:'ERR_CON_CURDT_GREATER_EFFECTIVE'});
										} else {
											CityConstants.create({
												bank_ifsc:						constantsCompanyBankIfsc,
												bank_address:					constantsCompanyBankAddress,
												delivery_address:				constantsCargoDeliveryAddress,
												customs_address:				constantsCompanyCustomAddress,
												registered_address:				constantsCompanyRegisteredAddress,
												gstin_number:					constantsGstin,
												hsn:							constantsHsnCode,
												igst_percentage:				constantsIgst,
												cgst_percentage:				constantsCgst,
												sgst_percentage:				constantsSgst,
												collect_fees_percentage:		constantsCollectFessInPerc,
												collect_fees_min_usd:			constantsMinimumCollectFeesUsd,
												delivery_order_charge:			constantsDeliveryOrderCharge,
												delivery_order_charge_baggage:	constantsDeliveryOrderBaggageCharge,
												direct_delivery_charges:		constantsDirectDeliveryCharge,
												break_bulk_charges:				constantsBreakBulkCharge,
												miscellaneous_charges:			constantsMiscellaneousCharge,
												cartage_charge_min_weight:		constantsMinimumCartageWeight,
												cartage_charge_min:				constantsMinimumCartageCharge,
												cartage_charge_per_kg:			constantsCartageChargePerKg,
												signatory:						constantsSignatory,
												designation:					constantsDesignation,
												can_front:						constantsCanFront,
												can_back:						constantsCanBack,
												iata_code:						constantsCity,
												effective_from: 				constantsEffectiveFrom,
												// gst_budget_code:				constantsGstBudgetCode,
												// gst_budget_account:				constantsGstBudgetAccount,
												// approved_by:					constantsApprovedBy,
												// approver_title:					constantsApproverTitle,
												// approver_email:					constantsApproverEmail,
												intimation_email:				constantsIntimationEmail,
												line_manager_email:				constantsLineManagerEmail,
												approval_manager_email:			constantsApprovalManagerEmail
											}).fetch().exec(function (err, createdConstants) {
												if (err) {
													sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + err);
													return res.send({error: 'Something Happend During Creating Record'});
												} else {
													sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (constants - post) Constants created');
													return res.send({value: createdConstants});
												}
											});
										}
									}
								});
							} else {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (constants - post)' + sails.config.globals.uniqueError);
								return res.send({error: sails.config.globals.uniqueError, error_code:'ERR_CON_E_UNIQUE'});
							}
						}
					}
				});
			}
		}
	},
	//function to show constant page
	getconstantlist: function(req, res) {
		//show constants for user
		if (sails.config.custom.access_allowed(req.user.role, 'User')) {
			var currentTimeStamp = Date.now();
			var city = req.query.inwardcargo_constants_list_city_input;
			sails.config.globals.async.waterfall([
				function (callback) {
					Ports.find({ where: {
						and : [
							{ "is_inward_port" : true },
							{ iata_code: req.user.iata_code }
						]
					}, sort: 'iata_code'}, function(err, ports) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getconstantlist - get)' + err);
							callback('something went wrong while finding airports', null, null);
						} else {
							if(ports.length > 0) {
								sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (getconstantlist - get) find all ports who matches the criteria');
								callback(null, ports);
							} else{
								callback('There are no ports to work with', null, null);
							}
						}
					});
				}, function (ports, callback) {
					if(city == undefined || city == null || city == '') {
						sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (getconstantlist - get) if city is undefined then take first city');
						city = ports[0].iata_code;
					}
					CityConstants.findOne({
							and : [
								{iata_code: city},
								{ expires_on: { '>': currentTimeStamp }},
								{ effective_from: { '<': currentTimeStamp }}
							]
						}
						, function(err, cityconstants) {
							if (err) {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getconstantlist - get) ' + err);
									callback('something went wrong while finding city user constants', null, null);
							} else {
								sails.log.info(req.user.username + ' - ' + new Date() +'Info - (getconstantlist - get) find city constants who matches the criteria');
								callback(null, ports, cityconstants);
							}
						});
				}
			], function (err, ports, cityconstants) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getconstantlist - get)' + err);
					return res.view('pages/imlost', {error: err});
				} else {
					sails.log.info(req.user.username + ' - ' + new Date() +'Info - (getconstantlist - get) render user constant page');
					return res.view('pages/userconstants',{ cityconstantdetails: cityconstants, airportlistdetails: ports, currentCity: city});
				}
			});
		} else {
			//show constants for admin
			sails.config.globals.async.waterfall([
				function (callback) {
					Ports.find({ where: { "is_inward_port" : true }, sort: 'iata_code'}, function(err, ports) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - ( getconstantlist - get)' + err);
							callback('something went wrong while finding airports', null, null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() +'Info - (getconstantlist - get) find all ports who matches the criteria');
							callback(null, ports);
						}
					});
				}, function (ports, callback) {
					CityConstants.find({where: {
					and : [
						{ expires_on: { '>': Date.now() }}
					]
				}}, function(err, cityconstants) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getconstantlist - get) ' + err);
							callback('something went wrong while finding airports', null, null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() +'Info - (getconstantlist - get) find constants who matches the criteria');
							callback(null, ports, cityconstants);
						}
					});
				}
			], function (err, ports, cityconstants) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getconstantlist - get)' + err);
					return res.view('pages/imlost', {error: err});
				} else {
					var currentDate = new Date(new Date().setHours(0,0,0,0)).getTime();
					var noDatesToDisplay = sails.config.globals.display_effective_from_dates;
					sails.log.info(req.user.username + ' - ' + new Date() +'Info - (getconstantlist - get) render constants page for admin');
					return res.view('pages/constants',{airportlistdetails: ports, cityconstantdetails: cityconstants, currentDate: currentDate, noDatesToDisplay: noDatesToDisplay});
				}
			});
		}
	}
};
