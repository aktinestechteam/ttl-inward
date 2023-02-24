/**
 * AwbController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	
	changeAWBDestination: async function(req, res) {
		//	remove or void all the part awbs of this awb number
		let parts = await PartAwb.update({awb_number: req.body.awb_no, void_on: 0}).set({void_on: Date.now(), void_reason: 'Change in destination to ' + req.body.new_iata_city}).fetch();
		//	use the void_on = 0 object of AWBUserData and change its destination to new value
		await AwbUserData.update({awb_number: req.body.awb_no, void_on: 0}).set({igm_city: req.body.new_iata_city});
		//	Change the destination value in the AWB too
		await Awb.update({awb_number: req.body.awb_no}).set({awb_city: req.body.new_iata_city, destination: req.body.new_iata_city});
		//	Add a transhipment object accordingly
		let total_pcs = 0;
		let total_wt = 0;
		let igm_city = undefined;
		let igm_number = undefined;
		let flight_no = undefined;
		let commodity = undefined;
		let src = undefined;
		
		for(let i = 0; i < parts.length; i++) {
			total_pcs += parts[i].no_of_pieces_received;
			total_wt += parts[i].weight_received;
			
			if(!igm_city)
				igm_city = parts[i].igm_city;
			
			if(!igm_number)
				igm_number = parts[i].igm_number;
			
			if(!flight_no)
				flight_no = parts[i].flight_number;
			
			if(!commodity)
				commodity = parts[i].commodity;
			
			if(!src)
				src = parts[i].origin;
		}
		
		await Transhipment.create({
			igm_city: igm_city,
			awb_number: req.body.awb_no,
			source: src,
			destination: req.body.new_iata_city,
			igm_no_rx: igm_number,
			flight_no_rx: flight_no,

			no_of_pieces_rx: total_pcs,
			weight_rx: total_wt,
			commodity: commodity
		});
		
		res.ok();
	},
		
	awbdetails: function (req, res) {
		showAWB(req, res);
	},
		
	requestdeletepartawb: async function(req, res) {
		let deletePartAwbId = req.body.inwardcargo_awb_edit_partawb_delete;
		let reason_type = req.body.reason_type;
		let reason = req.body.reason;
		let now_date = Date.now();
		
		if(sails.config.custom.allow_awb_delete_without_permission) {
			await PartAwb.update({id: deletePartAwbId}).set({
				void_on: now_date,
				void_reason: '' + reason_type + ' - ' + reason + ''
			});
			return res.json(sails.config.custom.jsonResponse(null, true));
		}

		if(deletePartAwbId) {
			let partAwbPending = await PartAwbPending.create({
				part_awb: deletePartAwbId,
				created_by: req.user.username,
				reason_type: reason_type,
				reason: reason,
			}).fetch();
			
			let partAwb = await PartAwb.findOne({id: deletePartAwbId});
			
			let part_awb_info = (
				'<table border="1">' +
					'<tr><td>AWB</td><td>' + partAwb.awb_number + '</td></tr>' + 
					'<tr><td>IGM</td><td>' + partAwb.igm_number + '</td></tr>' + 
					'<tr><td>Station</td><td>' + partAwb.igm_city + '</td></tr>' + 
					'<tr><td>Flight No</td><td>' + partAwb.flight_number + '</td></tr>' + 
					'<tr><td>Flight Date</td><td>' + sails.config.custom.getReadableDate(partAwb.flight_date) + '</td></tr>' + 
					'<tr><td>Pieces</td><td>' + partAwb.no_of_pieces_received + '</td></tr>' + 
					'<tr><td>Weight</td><td>' + partAwb.weight_received + '</td></tr>' + 
					'<tr><td>Commodity</td><td>' + partAwb.commodity + '</td></tr>' + 
					'<tr><td>Removal Reason</td><td>' + reason_type + ' - ' + reason + '</td></tr>' + 
				'</table>'
			); 
			
			let approve_decline_html = '<h3><a href="' + sails.config.custom.base_url + '/approvepartawbdeletion/' + partAwbPending.id  + '">Click to Approve</a></h3><h3><a href="' + sails.config.custom.base_url + '/declinepartawbdeletion/' + partAwbPending.id  + '">Click to Decline</a></h3>';

			let cityConstant = await CityConstants.findOne({iata_code: partAwb.igm_city, expires_on: {'>': now_date}, effective_from: {'<': now_date}});
			await sails.helpers.sendEmail.with({
				to: cityConstant.approval_manager_email,
				subject: '' + partAwb.awb_number + ' - AWB Delete request',
				html: part_awb_info + approve_decline_html
			});
			
			res.json(sails.config.custom.jsonResponse(null, true));
		} else {
			res.json(sails.config.custom.jsonResponse('The input parameters are missing', null));
		}
	},
		
	approvepartawbdeletion: async function(req, res) {
		let id = req.params.id;
		let partAwbPending = await PartAwbPending.findOne({id: id}).populate('part_awb');
		
		if(!partAwbPending) {
			res.view('pages/imlost', {error: 'This action is not allowed'});
			return;
		}
		
		if(partAwbPending.status === 'pending') {
			let partAwb = partAwbPending.part_awb;
			if(partAwb.can_document || partAwb.do_document || partAwb.void_on) {
				res.send('The AWB part cannot be removed as CAN/DO is already issued ');
			} else {
				let now_date = Date.now();
				await PartAwb.update({id: partAwb.id}).set({
					void_on: now_date,
					void_reason: '' + partAwbPending.reason_type + ' - ' + partAwbPending.reason + ''
				});
				
				await PartAwbPending.update({id: partAwbPending.id}).set({
					status: 'approved',
					actioned_on: now_date
				})
				
				res.send('The AWB part is removed successfully');
			}
		} else {
			res.send('The removal request for the ' + partAwbPending.part_awb.awb_number + ' is already ' + partAwbPending.status);
		}
	},
		
	declinepartawbdeletion: async function(req, res) {
		let id = req.params.id;
		let partAwbPending = await PartAwbPending.findOne({id: id}).populate('part_awb');
		
		if(!partAwbPending) {
			res.view('pages/imlost', {error: 'This action is not allowed'});
			return;
		}
		
		if(partAwbPending.status === 'pending') {
			let partAwb = partAwbPending.part_awb;
			if(partAwb.can_document || partAwb.do_document || partAwb.void_on) {
				res.send('The AWB part cannot be removed as CAN/DO is already issued, this action of decline is registered.');
			} else {
				let now_date = Date.now();
				
				await PartAwbPending.update({id: partAwbPending.id}).set({
					status: 'rejected',
					actioned_on: now_date
				})
				
				res.send('The AWB part removal request is registered as "decline" successfully');
			}
		} else {
			res.send('The removal request for the ' + partAwbPending.part_awb.awb_number + ' is already ' + partAwbPending.status);
		}
	},
		
	//function to delete partawb
	deletepartawb: function (req, res) {
		var deletePartAwbId = req.body.inwardcargo_awb_edit_partawb_delete;
		PartAwb.destroy({
			'_id': deletePartAwbId
		}).exec(function (err, partawb) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (deletepartawb - post) ' + err);
				return res.send({
					error: 'something went wrong while deleting AWB'
				});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (deletepartawb - post) delete partawb successfully');
				return res.send({
					result: true
				});
			}
		});
	},
	//function to get gstcode
	getgstcode: function (req, res) {
		var state = req.query.state;
		Gst.findOne({
			state_name: state
		}, function (err, gst) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (getgstcode - get) ' + err);
				return res.send({
					error: 'Something Happens During Finding gst code'
				});
			} else {
				if (gst) {
					sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (getgstcode - get) gstcode find successfully');
					return res.send({
						value: gst.gst_code
					});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (getgstcode - get) ' + 'GST code not found');
					return res.send({
						error: 'GST code not found'
					});
				}
			}
		});
	},
	getreasonsforvoid: function (req, res) {
		var reason_select = undefined;
		if (req.query.modal_title == 'Void AWB') {
			reason_select = 'Reasons for voiding AWB';
		} else if (req.query.modal_title == 'Void DO') {
			reason_select = 'Reasons for voiding DO';
		} else if (req.query.modal_title == 'Void Invoice') {
			reason_select = 'Reasons for voiding Invoice';
		}
		Reasons.find({
			reason_type: reason_select,
			make_it_visible: true
		}, function (err, reasons) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (getreasonsforvoid - get) ' + err);
				return res.send({
					error: 'Something Happens During Finding Reasons'
				});
			} else {
				if (reasons != undefined || reasons != null) {
					sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (getreasonsforvoid - get) Reasons find successfully');
					return res.send({
						value: reasons
					});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (getreasonsforvoid - get) ' + 'Reasons May be undefined');
					return res.send({
						error: 'Something Happens During Updating'
					});
				}
			}
		});
	},
	// function to edit partawb
	partawbedit: function (req, res) {
		var editpartawb = {};
		editpartawb.flight_number = req.body.inwardcargo_awb_edit_partawb_flight_number_input;
		editpartawb.no_of_pieces_received = req.body.inwardcargo_awb_edit_partawb_pieces_received_input;
		editpartawb.weight_received = req.body.inwardcargo_awb_edit_partawb_weight_received_input;
		editpartawb.commodity = req.body.inwardcargo_awb_edit_partawb_commodity_input;
		editpartawb.void_explanation = req.body.inwardcargo_awb_edit_partawb_reason_input;
		editpartawb.void_reason = req.body.inwardcargo_awb_edit_partawb_reason_type_select;
		PartAwb.update({
			_id: req.body.inwardcargo_awb_edit_partawb_id
		}, editpartawb).fetch().exec(function (err, updatedPartAwb) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (partawbedit - post) ' + err);
				return res.send({
					error: 'Something Happens During Updating'
				});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (partawbedit - post) partawb updated successfully');
				return res.send({
					value: updatedPartAwb[0]
				});
			}
		});
	},
	//function to awb creation
	awbsubmit: function (req, res) {
		sails.config.globals.async.waterfall([
			//	Find the AWB
			function (callback) {
				Awb.findOne({
					awb_number: req.body.inwardcargo_awb_awb_number_input
				}, function (err, awb) {
					if (err || awb == undefined) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post)' + err);
						callback('Error while finding the  AWB during savig', null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) find awb who matches the criteria');
						callback(null, awb);
					}
				});
			},
			function (awb, callback) {
				AwbUserData.findOne({
					awb_number: awb.awb_number,
					void_on: 0
				}, function (err, awb_user_data) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
						callback('Error while finding the AWBUserData during saving of AWB', null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) find awb userdata who matches the selection criteria');
						callback(null, awb, awb_user_data);
					}
				});
			},
			//	Find the consignee
			function (awb, awb_user_data, callback) {
				Address.findOne({
					_id: req.body.inwardcargo_awb_consignee
				}, function (err, address) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
						callback('Error while finding the consignee address during saving of awb', null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) find consignee who matches the selection criteria');
						callback(null, awb, awb_user_data, address);
					}
				});
			},
			//	Get required constants for the evaluation of the costs
			function (awb, awb_user_data, address, callback) {
				var currentTimeStamp = awb_user_data.rate_reference_date === 0 ? Date.now() : awb_user_data.rate_reference_date;
				CityConstants.findOne({
					and: [{
							iata_code: awb.awb_city
						},
						{
							expires_on: {
								'>': currentTimeStamp
							}
						},
						{
							effective_from: {
								'<': currentTimeStamp
							}
						}
					]
				}, function (err, cityconstants) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
						callback('Error while finding the constants during saving of awb', null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) find city constants who matches the criteria');
						callback(null, awb, awb_user_data, address, cityconstants);
					}
				});
			},
			//	Save the details of the user to the AWB
			function (awb, awb_user_data, address, cityconstants, callback) {
				if (address.is_enable_consignee) {
					awb_user_data.consignee = address.id;
					awb_user_data.consignee_name = address.name;
					awb_user_data.consignee_address = address.address;
					awb_user_data.consignee_address2 = address.address2;
					awb_user_data.consignee_email = address.email;
					awb_user_data.consignee_phone = address.phone;
					awb_user_data.consignee_pincode = address.pincode == undefined ? awb.consignee_pincode : Number(address.pincode);
					awb_user_data.consignee_state = address.state;
					awb_user_data.consignee_gstn = address.gstin;
					awb_user_data.consignee_is_sez = address.is_sez;
					awb_user_data.gst_exemption = address.gst_exemption ? (address.gst_exemption_till_date >= Date.now()) : false;
					awb_user_data.consignee_type = address.type_of_customer;
					awb_user_data.consignee_credit_period = address.credit_period;
					awb_user_data.chargable_weight = req.body.inwardcargo_awb_chargable_weight_input == undefined ? awb.chargable_weight : Number(req.body.inwardcargo_awb_chargable_weight_input);

					awb_user_data.collect_charges_type = req.body.inwardcargo_awb_collect_charges_type;
					awb_user_data.collect_weight_charge = req.body.inwardcargo_awb_collect_weight_charge_input == undefined ? awb_user_data.collect_weight_charge : Number(req.body.inwardcargo_awb_collect_weight_charge_input);
					awb_user_data.collect_valuation_charge = req.body.inwardcargo_awb_collect_valuation_charge_input == undefined ? awb_user_data.collect_valuation_charge : Number(req.body.inwardcargo_awb_collect_valuation_charge_input);
					awb_user_data.collect_tax = req.body.inwardcargo_awb_collect_tax_input == undefined ? awb_user_data.collect_tax : Number(req.body.inwardcargo_awb_collect_tax_input);
					awb_user_data.collect_due_agent_charge = req.body.inwardcargo_awb_collect_due_agent_charge_input == undefined ? awb_user_data.collect_due_agent_charge : Number(req.body.inwardcargo_awb_collect_due_agent_charge_input);
					awb_user_data.collect_due_carrier_charge = req.body.inwardcargo_awb_collect_due_agent_charge_input == undefined ? awb_user_data.collect_due_carrier_charge : Number(req.body.inwardcargo_awb_collect_due_carrier_charge_input);
					awb_user_data.collect_currency_name = req.body.inwardcargo_awb_collect_currency_name_input;

					awb_user_data.notify_type = req.body.inwardcargo_awb_notify_select;
					awb_user_data.bro_required = (req.body.inwardcargo_awb_notify_select === 'Bank') ? true : false; //	We want BRO required to be true only for Bank
					awb_user_data.notify_address = (req.body.inwardcargo_awb_notify_address);
					awb_user_data.no_of_hawb = req.body.inwardcargo_awb_total_number_of_houses == undefined ? awb_user_data.no_of_hawb : Number(req.body.inwardcargo_awb_total_number_of_houses);
					awb_user_data.expected_no_of_pieces = req.body.inwardcargo_awb_expected_no_of_pieces == undefined ? awb_user_data.expected_no_of_pieces : Number(req.body.inwardcargo_awb_expected_no_of_pieces);
					awb_user_data.expected_weight = req.body.inwardcargo_awb_expected_weight == undefined ? awb_user_data.expected_weight : Number(req.body.inwardcargo_awb_expected_weight);

					awb_user_data.delivery_option = req.body.inwardcargo_awb_delivery_option;

					awb_user_data.collect_fee = req.body.inwardcargo_awb_collect_fee_input == undefined ? awb.collect_fee : Number(req.body.inwardcargo_awb_collect_fee_input);

					AwbUserData.update({
						awb_number: req.body.inwardcargo_awb_awb_number_input,
						void_on: 0
					}, awb_user_data).fetch().exec(function (err, updatedAwbuserData) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post)' + err);
							callback('Error while updating the AWBuserData while saving the awb', null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) AWBuserData updated successfully');
							callback(null, awb);//, updatedAwbuserData);
						}
					});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
					callback('The consignee is not enable and hence cannot save his data', null);
				}
			},
			/*function (awb, updateAwbUserData, callback) {
				Awb.update({
					_id: awb.id
				}, {
					origin: req.body.inwardcargo_awb_flight_from_select,
					destination: req.body.inwardcargo_awb_flight_to_select
				}).fetch().exec(function (err, updatedAwbs) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
						callback('Error while updating the awb during saving', null);
					} else {
						if (updatedAwbs.length === 0) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post)' + 'AWB noting got updated');
							callback('AWB noting got updated', null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) AWB updated successfully');
							callback(null, updatedAwbs);
						}
					}
				});
			},
			function (awb, callback) {
				PartAwb.update({
					awb_number: awb[0].awb_number
				}, {
					origin: req.body.inwardcargo_awb_flight_from_select,
					destination: req.body.inwardcargo_awb_flight_to_select
				}).fetch().exec(function (err, updatedPartAwbs) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post)' + err);
						callback('Error while updating the partAWB during saving awb', null);
					} else {
						if (updatedPartAwbs.length === 0) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post)' + 'Part AWB noting got updated');
							callback('Part AWB noting got updated', null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) PARTAWB updated successfully');
							callback(null, updatedPartAwbs);
						}
					}
				});
			}*/
		], function (err, final) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbsubmit - post) ' + err);
				res.view('pages/imlost', {
					error: err
				});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbsubmit - post) render awb page');
				return res.redirect('/awb?inwardcargo_igm_awb_number=' + req.body.inwardcargo_awb_awb_number_input);
			}
		});
	},
	//function to void awb
	voidawb: function (req, res) {
		//	set the void_on values of the AwbUserData to Date.now()
		//	Create a duplicate of the AwbUserData that is void, with the void_on = 0
		//	Render a view where the user can edit the screen
		var awb_number = req.body.awb_number;
		if (awb_number) {
			sails.config.globals.async.waterfall([
				function (callback) {
					AwbUserData.update({
						awb_number: awb_number,
						void_on: 0
					}, {
						void_on: Date.now(),
						void_reason: req.body.selected_reason,
						void_explanation: req.body.user_typed_reason
					}).fetch().exec(function (err, void_awb_user_data) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post)' + err);
							callback('error while updating awb user data at void awb', null);
						} else {
							if (void_awb_user_data) {
								sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) AwbUserData updated successfully');
								callback(null, void_awb_user_data);
							} else {
								callback('failed at voiding the awb user data', null);
							}
						}
					});
				},
				function (void_awb_user_data, callback) {
					//	Need to take index 0 since we believe that the update above would have happened for 1 object only in db
					AwbUserData.create({
						awb_number: awb_number,
						igm_city: void_awb_user_data[0].igm_city,
						rate_reference_date: void_awb_user_data[0].rate_reference_date
					}).fetch().exec(function (err, new_awb_user_data) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post)' + err);
							callback('Error in creating new awb user data at awb void', null);
						} else {
							if (new_awb_user_data) {
								sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) AwbUserData created successfully');
								callback(null);
							} else {
								callback('Could not create new awb user data at awb void', null);
							}
						}
					});
				},
				function (callback) {
					Can.update({
						awb_number: awb_number,
						void_on: 0
					}, {
						void_on: Date.now(),
						void_reason: req.body.selected_reason,
						void_explanation: req.body.user_typed_reason
					}).fetch().exec(function (err, void_can_data) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post)' + err);
							callback('error while updating can data at void awb', null);
						} else {
							if (void_can_data) {
								sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) Can updated successfully');
								callback(null, void_can_data);
							} else {
								callback('failed at voiding the awb user data', null);
							}
						}
					});
				},
				function (void_can_data, callback) {
					async.each(void_can_data, function (can, callback) {
						PartAwb.update({
							_id: can.part_awb
						}, {
							can_document: ""
						}).fetch().exec(function (err, partawb) {
							if (err) {
								callback('error while updating partawb at void awb');
							} else {
								if (partawb) {
									sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) PartAwb updated successfully');
									callback();
								} else {
									callback('failed at voiding the partawb');
								}
							}
						});
					}, function (err) {
						// if any of the file processing produced an error, err would equal that error
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post)' + err);
							callback(err, null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) void awb final callback success updated successfully');
							callback(null, true);
						}
					});
				},
			], function (err, data) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post)' + err);
					res.send({
						error: err
					});
				} else {
					sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (voidawb - post) voiding awb successfully');
					res.send({
						success: data
					});
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (voidawb - post) ' + 'cannot operate on the empty input values');
			res.send({
				error: 'cannot operate on the empty input values'
			});
		}
	},
	//function to update awbbroreceived status
	awbbroreceived: function (req, res) {
		if (req.body.inwardcargo_awb_number) {
			AwbUserData.update({
				awb_number: req.body.inwardcargo_awb_number,
				void_on: 0
			}, {
				bro_received: true
			}).fetch().exec(function (err, updatedAwbUserData) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbbroreceived - post)' + err);
					return res.view('pages/imlost', {
						error: 'Failed to update that BRO is received for AWB ' + req.body.inwardcargo_awb_number
					});
				} else {
					sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbbroreceived - post) AwbUserData updated successfully and bro_received');
					return res.redirect('/awb?inwardcargo_igm_awb_number=' + req.body.inwardcargo_awb_number);
				}
			});
		} else {
			sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbbroreceived - post) ' + 'There is no AWB linked to this operations');
			res.send({
				error: 'There is no AWB linked to this operations'
			});
		}
	},
	//function for finding consignee details
	awbgetconsigneedetails: function (req, res) {
		consigneeId = req.body.inwardcargo_awb_consignee;
		Address.find({
			_id: consigneeId
		}, function (err, consignee) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbgetconsigneedetails - post)' + err);
				return res.send({
					error: 'Something Happens During Finding Consignee Details'
				});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbgetconsigneedetails - post) consignee find successfully');
				return res.send({
					value: consignee[0]
				});
			}
		});
	}
};

// function for showing awb
function showAWB(req, res) {
	if (req.query.inwardcargo_igm_awb_number != undefined) {
		sails.config.globals.async.waterfall([
			function (callback) {
				Awb.find({
					awb_number: req.query.inwardcargo_igm_awb_number
				}, function (err, awbs) {
					if (err || awbs == null || awbs.length == 0) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('something went wrong while finding awb', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) AWB find successfully');
						callback(null, awbs[0]);
					}
				});
			},
			function (awb, callback) {
				PartAwb.find({
					awb_number: req.query.inwardcargo_igm_awb_number,
					void_on: 0
				}, function (err, part_awbs) {
					if (err || part_awbs == null || part_awbs.length == 0) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('something went wrong while finding partAwbs', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) partAWB find successfully');
						callback(null, awb, part_awbs);
					}
				});
			},
			function (awb, part_awbs, callback) {
				Hawb.find({
					mawb_number: part_awbs[0].awb_number
				}, function (err, hawbs) {
					if (err || hawbs == null) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('something went wrong while finding hawbs', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) HAWB find successfully');
						callback(null, awb, part_awbs, hawbs);
					}
				});
			},
			function (awb, part_awbs, hawbs, callback) {
				//AwbUserData.findOne({awb_number: awb.awb_number, void_on: 0}, function(err, awb_user_data) {
				AwbUserData.find({
					awb_number: awb.awb_number
				}, function (err, awb_user_data) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('something went wrong while finding awb user data', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						if (awb_user_data.length > 0) {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) AwbUserData find successfully');
							callback(null, awb, part_awbs, hawbs, awb_user_data);
						} else {
							callback('could not find awb user data', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
						}
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, callback) {
				Address.find(
					{
						where: {
							and: [
								{city_iata_code: awb.awb_city},
								{is_enable_consignee: true}
							]
						},
						sort: 'name'
					}, function (err, consignees) {
					if (err || consignees == null) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('something went wrong while finding consignee addresses', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Consignee find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data, consignees);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, callback) {
				Ports.find({
					where: {},
					sort: 'iata_code'
				}, function (err, portsall) {
					if (err || portsall == null) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('something went wrong while finding airports', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Ports find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data, consignees, portsall);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, callback) {
				//	We should show the rates as per the reference date set, otherwise as of today
				var void_0_awb_user_data = undefined;
				for (let i = 0; i < awb_user_data.length; i++) {
					if (awb_user_data[i].void_on === 0)
						void_0_awb_user_data = awb_user_data[i];
				}

				var currentTimeStamp = (void_0_awb_user_data != undefined && void_0_awb_user_data.rate_reference_date === 0) ? Date.now() : void_0_awb_user_data.rate_reference_date;
				CityConstants.findOne({
					and: [{
							iata_code: awb.awb_city
						},
						{
							expires_on: {
								'>': currentTimeStamp
							}
						},
						{
							effective_from: {
								'<': currentTimeStamp
							}
						}
					]
				}, function (err, cityconstants) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('failed to find constants at this point in time', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						if (cityconstants) {
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) cityconstant find successfully');
							callback(null, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants);
						} else {
							callback('unable to find constants at this point in time', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
						}
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, callback) {
				//	We should show the rates as per the reference date set, otherwise as of today
				var void_0_awb_user_data = undefined;
				for (let i = 0; i < awb_user_data.length; i++) {
					if (awb_user_data[i].void_on === 0)
						void_0_awb_user_data = awb_user_data[i];
				}

				var currentTimeStamp = (void_0_awb_user_data != undefined && void_0_awb_user_data.rate_reference_date === 0) ? Date.now() : void_0_awb_user_data.rate_reference_date;
				ExchangeRates.find({
					and: [
						/*{iata_code: awb.awb_city},*/
						{
							expires_on: {
								'>': currentTimeStamp
							}
						},
						{
							effective_from: {
								'<': currentTimeStamp
							}
						}
					]
				}, function (err, exchangerates) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('unable to find exchangerates at this point in time', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) exchangerates find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, callback) {
				Reasons.find({
					reason_type: 'Part AWB Edit Reasons'
				}, function (err, reasons) {
					if (err || reasons == null) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get)' + err);
						callback('something went wrong while finding reasons', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Reasons find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, callback) {
				Do.find({
					awb_number: awb.awb_number
				}, function (err, dos) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('error in getting DOs', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) DO find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, callback) {
				var awb_user_data_ids = [];
				var void_0_index = 0;
				for (var i = 0; i < awb_user_data.length; i++) {
					if (awb_user_data[i].void_on === 0)
						void_0_index = i;

					awb_user_data_ids.push(awb_user_data[i].id);
				}
				Invoice.find({
					awb_user_datas: awb_user_data_ids
				}, async function (err, invoices) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('error in getting Invoices', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						
						invoices.forEach(async function (invoice, index) {
							invoices[index].challan_no = invoice.challans ? await Challan.find({id: {in: invoice.challans}}) : [];
							
							console.log(invoices[index].challan_no);
						});
						
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) invoice find successfully');
						callback(null, awb, part_awbs, hawbs, awb_user_data[void_0_index], consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices);
					}
				});
			},
			function (awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, callback) {
				Gst.find({}, function (err, gst) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('something went wrong while finding gst', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Gst find successfully');
						callback(null, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices);
					}
				});
			},
			function (gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, callback) {
				Ports.find({
					where: {
						and: [{
								"is_inward_port": true
							},
							/*{
								iata_code: req.user.iata_code
							}*/
						]
					},
					sort: 'iata_code'
				}, function (err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
						callback('Something went wrong while finding airport', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Ports find successfully');
						callback(null, ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices);
					}
				});
			},
			function (ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, callback) {
				if (awb_user_data.consignee && awb_user_data.consignee_credit_period != 'none') {
					Invoice.find({
						consignee: awb_user_data.consignee,
						void_on: 0,
						payment_received_date: 0
					}, function (err, unpaid_invoices) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
							callback('Error while finding unpaid awb', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
						} else {
							var total = 0;
							for (var i = 0; i < unpaid_invoices.length; i++) {
								total += unpaid_invoices[i].amount_billed;
							}
							sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Invoice find successfully');
							callback(null, ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, total);
						}
					})
					/*DCM.find({consignee: awb_user_data.consignee, invoiced_under_invoice_id: ''}, function(err, dcms) {
						if(err) {
							console.log(err);
							callback('Failed to find DCM for the consignee', null, null, null, null, null, null, null, null, null, null, null, null, null, null);
						} else {
							var total = 0;
							for(var i = 0; i < dcms.length; i++) {
								//for(var j = 0; j < dcms.length; j++) {
									//total += dcms[i].correct_amount[j];
									total += dcms[i].revised_total;
								//}
								//total += dcms[i].igst;
								//total += dcms[i].cgst;
								//total += dcms[i].sgst;
							}
							callback(null, ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, total);
						}
					});*/
				} else {
					callback(null, ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, 0);
				}
			}
		], async function (err, ports, gst, awb, part_awbs, hawbs, awb_user_data, consignees, portsall, cityconstants, exchangerates, reasons, dos, invoices, amt_balance) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + err);
				return res.view('pages/imlost', {
					error: err
				});
			} else {
				
				let transhipments = await Transhipment.find({awb_number: req.query.inwardcargo_igm_awb_number});
				let invoice_irn;
				if(sails.config.custom.e_invoice_supported) {
					for(let i = 0; i < invoices.length; i++) {
						if(invoices[i].void_on == 0) {
							invoice_irn = await IRN.findOne({
								invoice_number: invoices[i].invoice_number, 
								type_of_invoice: sails.config.custom.irn_invoice_types.invoice, 
								status: sails.config.custom.irn_job_status.done
							});
							break;
						}
					}
				}
				
				sails.log.info(req.user.username + ' - ' + new Date() + 'INFO - (awbdetails - get) Render awb successfully');
				return res.view('pages/awb', {
					currentpage: 'AWB',
					airportlistuser: ports,
					reasonsdetail: reasons,
					awb: awb,
					part_awbs: part_awbs,
					hawbs: hawbs,
					awb_user_data: awb_user_data,
					airportlistdetails: portsall,
					consigneedetails: consignees,
					cityconstant: cityconstants,
					exchangerates: exchangerates,
					dos: dos,
					invoices: invoices,
					invoice_irn: invoice_irn,
					gstlistdetails: gst,
					amt_balance: amt_balance, 
					transhipments: transhipments
				});
			}
		});
	} else {
		//	No AWB number was supplied
		sails.log.error(req.user.username + ' - ' + new Date() + ' ERR - (awbdetails - get) ' + 'Ooops, No AWB number supplied');
		res.send({
			error: 'Ooops, No AWB number supplied'
		});
	}
}
