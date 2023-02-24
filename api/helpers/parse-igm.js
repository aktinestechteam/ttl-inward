var voca = require('voca');

module.exports = {

	friendlyName: 'Parse IGM file',

	description: '',

	inputs: {
		igm_filepath:		{type: 'string'},
		igmCity:			{type: 'string'},
		igmDate:			{type: 'number'},
		igmNumber:			{type: 'number'},
		inwardDate:			{type: 'number'},
		username: 			{type: 'string'},
		flightNumber:		{type: 'string'}
	},

	exits: {

	},

	fn: function (inputs, exits) {
		sails.config.globals.async.waterfall([
			async function (callback) {
				let response = await sails.helpers.validateIgm.with(inputs);
				if(response.err) {
					callback(response.err, null);
				} else {
					callback(null, response.igm_parsed_json, response.igm_parsed_mawb_json, response.igm_parsed_part_awb_json);
				}
			},
			//	Save the IGM file
			function (igm_parsed_json, igm_parsed_mawb_json, igm_parsed_part_awb_json, callback) {
				//saving igm details
				Igm.findOrCreate({igm_number: igm_parsed_json[0].igm_number}, igm_parsed_json[0])
				.exec(function(err, igm, wasCreated) {
					if (err) {
						sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
						callback('Something Happens While Creating Record', null);
					} else {
						if(wasCreated) {
							sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'IGM details saved successfully');
							callback(null, igm.id, igm_parsed_mawb_json, igm_parsed_part_awb_json);
						} else {
							//igm file already exist if necessary write logic to delete existing file
							callback('record already exist', null);
						}
					}
				});
			},
			function (igm_id, igm_parsed_mawb_json, igm_parsed_part_awb_json, callback) {
				ScannedFFM.create({
					igm: igm_id,
					igm_city: inputs.igmCity,
					status: 'upload_pending'
				}, function(err, scannedffm) {
					callback(null, igm_parsed_mawb_json, igm_parsed_part_awb_json);
				});
			},
			//	Create necessary Part AWB in the database
			function (igm_parsed_mawb_json, igm_parsed_part_awb_json, callback) {
				sails.config.globals.async.each(igm_parsed_part_awb_json, function(part_awb, callback) {
					if(inputs.igmCity === part_awb.destination) {
						PartAwb.create(part_awb).fetch().exec(function (err, part_awb_result) {
							if(err) {
								sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
								callback('Error adding single PartAwb');
							} else {
								sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'Created necessary Part AWB in the database');
								callback();
							}
						});
					} else {
						Transhipment.create({
							igm_city: inputs.igmCity,
							awb_number: part_awb.awb_number,
							source: part_awb.origin,
							destination: part_awb.destination,
							igm_no_rx: part_awb.igm_number,
							flight_no_rx: part_awb.flight_number,
							no_of_pieces_rx: part_awb.no_of_pieces_received,
							weight_rx: part_awb.weight_received,
							commodity: part_awb.commodity
						}, function(err, transhipment) {
							if(err) {
								sails.log.error(inputs.username + ' - ' + new Date() +' ERR - transhipment create (igmupload - post)' + err);
								callback('an error occured while creating transhipment = ' + err);
							} else {
								sails.config.globals.putinfolog(inputs.username, 'creating transhipment', 'post', 'Created necessary Transhipment in the database');
								callback();
							}
						});
					}
				}, function(err) {
					// if any of the file processing produced an error, err would equal that error
					if( err ) {
						sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
						callback('Error adding multiple PartAwb', null);
					} else {
						callback(null, igm_parsed_mawb_json)
					}
				});
			},
			//	Create the necessary AWB in the database
			function (igm_parsed_mawb_json, callback) {
				sails.config.globals.async.each(igm_parsed_mawb_json, function(awb, callback) {
					if(inputs.igmCity === awb.destination) {
						Awb.findOrCreate({awb_number: awb.awb_number}, awb)
						.exec(function(err, awb_response, wasCreated) {
							if(wasCreated) {
								sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'Awb created successfully');
								AwbUserData.create({awb_number: awb.awb_number, igm_city: inputs.igmCity}).fetch().exec(function(err, awb_user_data) {
									if(err) {
										sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
										callback('Error in creating awb user data');
									} else {
										if(awb_user_data) {
											sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'AwbUserData created successfully');
											callback();
										} else {
											callback('Could not create awb user data');
										}
									}
								});
							} else {
								if(err) {
									if (err.code == 'E_UNIQUE') {
										//	the duplicate object
										callback();
									} else {
										sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
										callback('Error adding single AWB');
									}
								} else {
									sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'Awb is already in database');
									callback();
								}
							}
						});
					} else {
						sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'Awb is transhipment');
						callback();
					}
				}, function(err) {
					if( err ) {
							sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
							callback('Error adding AWBs', null);
					} else {
								sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'proceed to next callback');
						callback(null, igm_parsed_mawb_json);
					}
				});
			}
		],
		//	FINAL Callback
		function (err, igm_parsed_mawb_json) {
			exits.success({err: err});
		});
	}
};
