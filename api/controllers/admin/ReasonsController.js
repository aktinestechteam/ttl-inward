/**
 * ReasonsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	// function to add reasons ,update reasons
	reasons: function(req, res) {
		var id = req.body.inwardcargo_reason_list_id;
		var reasonType = req.body.inwardcargo_reason_list_reason_type_input_modal;
		var reason = req.body.inwardcargo_reason_list_reason_input;
		var makeItVisible = req.body.inwardcargo_reason_list_make_it_visible;

		if (reasonType == undefined || reasonType == null || reasonType == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (reasons - post)' + 'Reason Type Cannot be blank');
			return res.send({error: 'Reason Type Cannot be blank', error_code:'ERR_R_REASONTYPE_BLANK'});
		} else if (reason == undefined || reason == null || reason == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (reasons - post)' + 'Reason Cannot be blank');
			return res.send({error: 'Reason Cannot be blank', error_code:'ERR_R_REASON_BLANK'});
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (reasons - post) Reasons all validation passed');
			Reasons.findOrCreate({ _id: id}, { reason_type: reasonType, reason: reason})
				.exec(async(err, reasons, wasCreated)=> {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (reasons - post)' + err);
						return res.send({error: 'Something Happend During Creating Record'});
					} else {
						Reasons.update({_id:reasons.id}, { make_it_visible: makeItVisible, reason_type: reasonType, reason: reason}).fetch()
							.exec(function(err, updatedReasons){
								if (err) {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (reasons - post)' + err);
									return res.send({error: 'Something Happens During Updating Or Inserting'});
								} else {
									sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (reasons - post) reasons updated successfully');
									return res.send({value:'/reasons' + ((reasonType == undefined) ? '' : '?inwardcargo_reason_list_reason_type_input=' + reasonType)});
								}
							});
					}
				});
		}
	},
	getreasonslist: function(req, res) {
		var reasonType = req.query.inwardcargo_reason_list_reason_type_input;
		if (reasonType == undefined) {
			reasonType = sails.config.globals.reasonType[0];
		}
		Reasons.find({reason_type: reasonType}, function(err, reasons) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonslist - get)' + err);
				return res.view('pages/imlost', {error: 'Error finding reasons'});
			} else {
				if (reasons != undefined || reasons != null) {
					sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (getreasonslist - get) find reasons who matches criteria and render reasons page');
					return res.view('pages/reasons',{reasonlistdetails: reasons, reasonType: reasonType, reasonTypes: sails.config.globals.reasonType});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonslist - get)' + 'There are no reasons to show');
					return res.view('pages/imlost', {error: 'There are no reasons to show'});
				}
			}
		});
	},
	deletereason:function(req, res){
		var deleteReasonId = req.body.inwardcargo_reason_list_delete_reason;
		Reasons.destroy({'_id' : deleteReasonId }).exec(function(err, reasons){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (deletereason - post)' + err);
				return res.view('pages/imlost', {error: 'Error while deleting the reason'});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (deletereason - post) delete reason who matches criteria and render reasons page');
				return res.send({result: true});
			}
		});
	}
};
