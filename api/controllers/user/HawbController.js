/**
 * HawbController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	//function to add hawb ,edit hawb
	hawb: function (req, res) {
		var hawbid = (req.body.inwardcargo_awb_hawb_id == '0') ? '' : req.body.inwardcargo_awb_hawb_id;
		var hawbNumber = req.body.inwardcargo_awb_hawb_number_input;
		var mawbNumber = req.body.inwardcargo_awb_mawb_number_input;
		var hawbnoOfPieces = req.body.inwardcargo_awb_hawb_number_of_pieces_input;
		var hawbtotalNoOfPieces = req.body.inwardcargo_awb_hawb_total_number_of_pieces_input;
		var hawbWeight = req.body.inwardcargo_awb_hawb_weight_input;
		var hawbTotalWeight = req.body.inwardcargo_awb_hawb_total_weight_input;
		var hawbOrigin = req.body.inwardcargo_awb_hawb_origin_select;
		var hawbDestination = req.body.inwardcargo_awb_hawb_destination_select;
		var hawbCreatedBy = req.user.username;

		if (hawbNumber == undefined || hawbNumber == null || hawbNumber == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Hawb Number Cannot be blank');
			return res.send({error: 'Hawb Number Cannot be blank'});
		}else if (mawbNumber == undefined || mawbNumber == null || mawbNumber == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Mawb Number Cannot be blank');
			return res.send({error: 'Mawb Number Cannot be blank'});
		} else if (hawbnoOfPieces == undefined || hawbnoOfPieces == null || hawbnoOfPieces == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'No Of Pieces Cannot be blank');
			return res.send({error: 'No Of Pieces Cannot be blank'});
		} else if (hawbtotalNoOfPieces == undefined || hawbtotalNoOfPieces == null || hawbtotalNoOfPieces == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Total No Of Pieces Cannot be blank');
			return res.send({error: 'Total No Of Pieces Cannot be blank'});
		} else if (hawbWeight == undefined || hawbWeight == null || hawbWeight == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Weight Cannot be blank');
			return res.send({error: 'Weight Cannot be blank'});
		} else if (hawbTotalWeight == undefined || hawbTotalWeight == null || hawbTotalWeight == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Total Weight Cannot be blank');
			return res.send({error: 'Total Weight Cannot be blank'});
		} else if (hawbOrigin == undefined || hawbOrigin == null || hawbOrigin == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Origin Cannot be blank');
			return res.send({error: 'Origin Cannot be blank'});
		} else if (hawbDestination == undefined || hawbDestination == null || hawbDestination == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + 'Destination Cannot be blank');
			return res.send({error: 'Destination Cannot be blank'});
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (hawb - post) all validation passed');
			Hawb.findOrCreate({ 	_id: hawbid}, {
				hawb_no: hawbNumber,
				mawb_number: mawbNumber,
				no_of_pieces: hawbnoOfPieces,
				total_no_of_pieces: hawbtotalNoOfPieces,
				weight:hawbWeight,
				total_weight:hawbTotalWeight,
		    origin:hawbOrigin,
		    destination:hawbDestination,
		    created_by:hawbCreatedBy
				})
				.exec(async(err, hawb, wasCreated)=> {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + err);
						return res.send({error: 'Something Happend During Creating Record'});
					} else {
						sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (hawb - post) check for existing hawb if it is not exist create new hawb');
						Hawb.update({_id:hawb.id}, {
							hawb_no: hawbNumber,
							mawb_number: mawbNumber,
							no_of_pieces: hawbnoOfPieces,
							total_no_of_pieces: hawbtotalNoOfPieces,
							weight:hawbWeight,
							total_weight:hawbTotalWeight,
					    origin:hawbOrigin,
					    destination:hawbDestination,
					    created_by:hawbCreatedBy}).fetch()
							.exec(function(err, updatedHawb){
								if (err) {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (hawb - post)' + err);
									return res.send({error: 'Something Happens During Updating Or Inserting'});
								} else {
									sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (hawb - post) HAWB updated successfully');
									return res.send({value: updatedHawb[0]});
								}
							});
					}
				});
		}
	},
	deletehawb:function(req, res){
		var deleteHawbId = req.body.inwardcargo_hawb_list_delete_hawb;
		var selected_reason = req.body.selected_reason;
		var user_typed_reason = req.body.user_typed_reason;
		sails.config.globals.async.waterfall([
			function (callback) {
				Hawb.update({_id:deleteHawbId}, {
					deletehawb_reason: selected_reason,
					deletehawb_explanation: user_typed_reason,
					deletedhawb_on: Date.now()
					}).fetch()
					.exec(function(err, updatedHawb){
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (deletehawb - post)' + err);
							callback('Something Happens During Updating Or Inserting', null);
						} else {
							sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (deletehawb - post) update deletedhawb_on field from hawb');
							callback(null, null);
						}
					});
			}
		], function(err, finalDeletedHawb) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (deletehawb - post)' + err);
				return res.send({error: 'Something Happens During'});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (deletehawb - post) delete hawb successfully');
				return res.send({value: true});
			}
		});
		/*Hawb.destroy({'_id' : deleteHawbId }).exec(function(err, hawbs){
			if(err) {
				return res.view('pages/error-403');
			} else {
				return res.send({result: true});
			}
		});*/
	},getreasonsfordeletehawb: function(req, res) {
		var reason_select = req.query.selected_reason;
		Reasons.find({reason_type: reason_select, make_it_visible:true}, function(err, reasons) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonsfordeletehawb - get)' + err);
				return res.send({error: 'Something Happens During Finding Reasons'});
			} else {
				if (reasons != undefined || reasons != null){
					sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (getreasonsfordeletehawb - get) Reasons find successfully for deleteing hawb');
					return res.send({value: reasons});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonsfordeletehawb - get) ' + 'Reasons may be undefined');
					return res.send({error: 'Reasons may be undefined'});
				}
			}
		});
	}
};
