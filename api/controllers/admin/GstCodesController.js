/**
 * GstCodesController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	// function for saving gstcodes
	gstcodes: function(req, res) {
		//getting data
		var id = req.body.inwardcargo_gstcodes_id;
		var gstCodes = req.body.inwardcargo_gstcodes_gst_code_input;
		var stateName = req.body.inwardcargo_gstcodes_state_name_input;
		var isGstNumber = /^\d+$/.test(gstCodes);
		var isStateNameNum = /^\d+$/.test(stateName);
		//validations check
		if (gstCodes == undefined || gstCodes == null || gstCodes == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + 'GST Code Cannot be blank');
			return res.send({error: 'GST Code Cannot be blank', error_code:'ERR_GC_GSTCODE_BLANK'});
		} else if (stateName == undefined || stateName == null || stateName == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + 'State Name Cannot be blank');
			return res.send({error: 'State Name Cannot be blank', error_code:'ERR_GC_STATE_BLANK'});
		} else if (!isGstNumber) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + 'GST Code must be a number');
			return res.send({error: 'GST Code must be a number', error_code:'ERR_GC_GSTCODE_NUMBER'});
		} else if (isStateNameNum) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + 'State Name Cannot be number');
			return res.send({error: 'State Name Cannot be number', error_code:'ERR_GC_STATE_NOTNUMBER'});
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (gstcodes - post)' + 'GSTCODES validations successfully');
			//check for gst code if it is already there, if not then create it
			Gst.findOrCreate({ _id: id}, { gst_code: gstCodes , state_name: stateName})
				.exec(async(err, gst, wasCreated)=> {
					if (err) {
						if (err.code == 'E_UNIQUE') {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + sails.config.globals.uniqueError);
							return res.send({error: sails.config.globals.uniqueError, error_code:'ERR_GC_E_UNIQUE'});
						} else {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + err);
							return res.send({error: 'Something Happend During Creating Record'});
						}
					} else {
						//gstcode found or created if not there
						sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (gstcodes - post) GSTCODE found or created new if not found');
						Gst.update({_id:gst.id}, {gst_code: gstCodes , state_name: stateName}).fetch()
							.exec(function(err, updatedGST){
								if (err) {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (gstcodes - post)' + err);
									return res.send({error: 'Something Happens During Updating Or Inserting'});
								} else {
									//gstcode updated successfully
									sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (gstcodes - post) GSTCODES updated successfully');
									return res.send({value: updatedGST[0]});
								}
							});
						}
				});
			}
	},
	//getting list of gstcodes
	getgstcodes: function(req, res) {
		Gst.find({where: {}, sort: 'gst_code'}, function(err, gst) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getgstcodes - get)' + err);
				return res.view('pages/imlost', {error: 'Error while finding the GST Code'});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (getgstcodes - get) GSTCODES found successfully');
				return res.view('pages/gstcodes',{gstcodesdetails: gst});
			}
		});
	},
	//delete gstcode
	deletegstcodes:function(req, res){
		var deleteGstCodeId = req.body.inwardcargo_gstcodes_delete_gstcode;
		Gst.destroy({'_id' : deleteGstCodeId }).exec(function(err, gst){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (deletegstcodes - post)' + err);
				return res.view('pages/imlost', {error: 'Error while deleting the GST'});
			} else {
				sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (deletegstcodes - post) GSTCODE deleted successfully');
				return res.send({result: true});
			}
		});
	}
};
