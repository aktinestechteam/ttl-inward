/**
 * IndexController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  index: function(req, res) {
		return res.redirect('/igm');
		/*if(req.user) {
			return res.view('pages/index');
			//res.redirect('/');
		} else {
			return res.view('pages/page-login');
			//return res.view('pages/page-login',{message: 'User Not Logged In'});
		}*/
	},
	changeigmnumber: function(req, res) {
		var igmNumber = req.body.inwardcargo_igm_igm_number;
		var newIgmNumber = req.body.inwardcargo_new_igm_number;
		var confirmIgmNumber = req.body.inwardcargo_confirm_igm_number;
		var selected_reason = req.body.selected_reason;
		var user_typed_reason = req.body.user_typed_reason;
		//console.log(req.body);
		sails.config.globals.async.waterfall([
			function(callback) {
				Igm.findOne({igm_number: igmNumber}, function(err, igm) {
					if(err) {
						callback('error finding igm', null);
					} else {
						if(igm) {
							igm.igm_number = newIgmNumber;
							igm.change_history.push({selected_reason: selected_reason, user_typed_reason: '' + igmNumber + ' to ' + newIgmNumber + ' - ' + new Date() + ' - ' + user_typed_reason});
							callback(null, igm);
						} else {
							callback('could not find the igm', null);
						}
					}
				});
			},
			function(igm, callback) {
				Igm.update({igm_number: igmNumber}, igm).fetch().exec(function(err, updatedIgm){
						if (err) {
							callback('Something Happens During Updating Igm', null);
						} else {
							callback(null);
						}
					});
			}, function(callback) {
				/*PartAwb.update({igm_number: igmNumber}, {igm_number: newIgmNumber}).fetch()
					.exec(function(err, updatedPartAwb){
						if (err) {
							callback('Something Happens During Updating Part Awb', null);
						} else {
							console.log(updatedPartAwb);
							callback(null, true);
						}
					});*/
					PartAwb.find({igm_number: igmNumber, void_on: 0}, function(err, part_awbs) {
						if (err) {
							//console.log("6");
							callback('error finding parts of awb', null);
						} else {
							//console.log(part_awbs);
							//callback(null, true);
							async.each(part_awbs, function(part_awb, callback) {
								PartAwb.update({igm_number: part_awb.igm_number}, {igm_number: newIgmNumber}).fetch()
									.exec(function(err, updatedPartAwb){
										if (err) {
											callback('Something Happens During Updating Part Awb');
										} else {
											callback();
										}
									});
							}, function(err) {
							    // if any of the file processing produced an error, err would equal that error
							    if( err ) {
							      // One of the iterations produced an error.
							      // All processing will now stop.
										//console.log("7");
							      callback(err, null);
							    } else {
										//console.log("8");
							      callback(null, true);
							    }
							});
						}
					});
			}
		],function(err, changeigmresult) {
			if (err) {
				//console.log("9");
				return res.send({error: err});
			} else {
				//console.log("10");
				return res.send({value: changeigmresult});
			}
		});
	}

};
