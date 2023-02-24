/**
 * IgmController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
var voca = require('voca');
var mkpath = require('mkpath');
module.exports = {
	//path to store igm :- uploads/bom/year(inward date)/month(inward date)/day(inward date)/igm
	igmupload: async function(req, res){
		var igmNumber = req.body.inwardcargo_igm_number;
		var inwardDate = new Date(req.body.inwardcargo_igm_inward_date);
		var igmDate = new Date(req.body.inwardcargo_igm_igm_date);
		var igmCity = req.body.inwardcargo_igm_city;
		var igmFlightNumber = req.body.inwardcargo_igm_flight_number;
		if(!igmCity) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
			return res.view('pages/imlost', {error: 'IGM City is blank'});
		}
		
		let currentTimeStamp = Date.now();
		let cityConstant = await CityConstants.findOne({
			where: {and: [{
					iata_code: igmCity
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
			]},
		});

		if(!cityConstant || !cityConstant.approval_manager_email) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - There is no approval manager for ' + igmCity);
			return res.view('pages/imlost', {error: 'There is no Approval Manager assigned for ' + igmCity});
		}
		
		if(req.body.inwardcargo_igm_createoption == 'inwardcargo_igm_createoption_ffm') {
			var uploadIGM = req.file('inwardcargo_igm_upload_new_igm_file');
			var fullFilePath = uploadIGM._files[0].stream.headers['content-disposition'].split('"').reverse()[1];
			var fslash_position = fullFilePath.indexOf('/');
			var bslash_position = fullFilePath.indexOf('\\');
			var tokens = fullFilePath;
			if(fslash_position)
				tokens = fullFilePath.split('/');
			if(bslash_position)
				tokens = fullFilePath.split('\\');

			var tempFileName = Date.now() + '_' + tokens[tokens.length-1];
			//var igmDirPath = 'uploads/'+igmCity+'/'+inwardDate.getFullYear()+'/'+(inwardDate.getMonth()+1)+'/'+inwardDate.getDate()+'/igm';
			sails.config.globals.async.waterfall([
				//	Make necessary file path to place the IGM file.
				function (callback) {
					/*mkpath(igmDirPath, function (err) {
					    if (err){
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
								callback('Error in creating path', null);
							} else{
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', 'make directory for saving igm file');
								callback(null);
							}
					});*/
					
					sails.config.custom.getdumppath('uploads/' + sails.config.custom.deployment_name + '/' + igmCity, async function(err, igmDirPath) {
						if(err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post) in getDumpPath' + err);
							callback('Error at creating path for uploaded file', null);
						} else {
							callback(null, igmDirPath);
						}
					});
				},
				//	Move the uploaded IGM file to the created path
				function (igmDirPath, callback) {
					uploadIGM.upload({
						saveAs: tempFileName,
						dirname: sails.config.appPath + igmDirPath
					}, function (err, uploadedIGMFiles){
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
							callback('somthing went wrong while uploading igm', null)
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', 'Move the uploaded IGM file to the created path');
							callback(null, igmDirPath, uploadedIGMFiles)
						}
					});
				},
				//	Start reading the uploaded IGM file and begin to parse.
				async function (igmDirPath, uploadedIGMFiles, callback) {
					/*let parsedIgm = await sails.helpers.parseIgm.with({igm_filepath: igmDirPath+'/'+tempFileName, username: req.user.username, igmCity: igmCity, igmNumber: igmNumber, igmDate: igmDate, inwardDate: inwardDate});
					callback(parsedIgm.err, true);*/
					let igmPending = await IgmPending.create({
						igm_number: igmNumber,
						igm_date: igmDate,
						flight_number: igmFlightNumber,
						flight_date: igmDate,
						inward_date: inwardDate,
						uploaded_by: req.user.username,
						filepath: igmDirPath + tempFileName,
						igm_city: igmCity,
						status: 'pending'
					}).fetch();
					console.log('' + sails.config.custom.base_url + '/approveigm/' + igmPending.id  + '');
					
					let validate_igm_response = await sails.helpers.validateIgm.with({igm_filepath: (sails.config.appPath + igmDirPath + tempFileName) /*TO REMOVE 1st FRONT SLASH*/, username: req.user.username, igmCity: igmCity, igmNumber: igmNumber, igmDate: igmDate, inwardDate: inwardDate, flightNumber: igmFlightNumber});

				
					if(validate_igm_response.err) {
						callback(validate_igm_response.error, false);
					} else {
						//callback(null, validate_igm_response.igm_parsed_json, validate_igm_response.igm_parsed_mawb_json, validate_igm_response.igm_parsed_part_awb_json);
						let igm_information_html = '<h3>Upload Information</h3>'
						igm_information_html += '<p> Uploaded By - ' + req.user.username + ' / ' + validate_igm_response.igm_parsed_json[0].igm_city + '</p>' + 
						'<p>IGM Date = ' + sails.config.custom.getReadableDate(validate_igm_response.igm_parsed_json[0].igm_date) + '</p>' + 
						'<p>Flight - ' + validate_igm_response.igm_parsed_json[0].flight_number + ' / ' + sails.config.custom.getReadableDate(validate_igm_response.igm_parsed_json[0].flight_date) + '</p>';
						
						let tr_tags = '';
						for(let i = 0; i < validate_igm_response.igm_parsed_part_awb_json.length; i++) {
							tr_tags += '<tr>';
								tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].awb_number + '</td>';
								tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].origin + '</td>';
				
								if(igmCity === validate_igm_response.igm_parsed_part_awb_json[i].destination)
									tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].destination + '</td>';
								else
									tr_tags += '<td><strong style="color: blue">' + validate_igm_response.igm_parsed_part_awb_json[i].destination + ' (T)</strong></td>';
				
								tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].no_of_pieces_received + '</td>';
								tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].weight_received + '</td>';
								tr_tags += '<td>' + validate_igm_response.igm_parsed_part_awb_json[i].commodity + '</td>';
							tr_tags += '</tr>';
						}
						let awb_data_html = '<table border="1"><thead><th>AWB #</th><th>Origin</th><th>Destination</th><th>Pieces</th><th>Weight(kg)</th><th>Commodity</th></thead><tbody>' + tr_tags + '</tbody></table>';
						
						let approve_decline_html = '<h3><a href="' + sails.config.custom.base_url + '/approveigm/' + igmPending.id  + '">Click to Approve</a></h3><h3><a href="' + sails.config.custom.base_url + '/declineigm/' + igmPending.id  + '">Click to Decline</a></h3>';
						
						await sails.helpers.sendEmail.with({
							to: cityConstant.approval_manager_email,
							subject: '' + igmNumber + ' - New IGM uploaded',
							html: igm_information_html + awb_data_html + approve_decline_html
						});
						callback(null, true);
					}
				}
			],
			//	FINAL Callback
			function (err, done) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post)' + err);
					return res.view('pages/imlost', {error: err});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', 'redirect to igm page');
					//return res.redirect('/igm?inwardcargo_igm_city=' + req.body.inwardcargo_igm_city + '&inwardcargo_igm_no_date=' + req.body.inwardcargo_igm_number + '&inwardcargo_igm_search_date=' + req.body.inwardcargo_igm_inward_date);
					return res.redirect('/igm?inwardcargo_igm_city=' + req.body.inwardcargo_igm_city + '&ty_msg=1');
				}
			});
		} else if(req.body.inwardcargo_igm_createoption == 'inwardcargo_igm_createoption_manually') {
			var igm_details = {};
			var igm_id = undefined;
			var igm_parsed_json = [];
			igm_details.igm_date = igmDate.getTime();
			//	need to convert it into timestamp
			igm_details.igm_number = igmNumber;
			igm_details.flight_date = igmDate.getTime();//getTimestampfromDate(split[3]).getTime();
			igm_details.inward_date = inwardDate.getTime();
			igm_details.uploaded_by = req.user.username;
			igm_details.igm_city = igmCity;
			igm_details.flight_number = igmFlightNumber;
			igm_parsed_json.push(igm_details);
			
			let igm = await Igm.findOne({igm_number: igmNumber});
			
			if(igm) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (igmupload - post)' + 'IGM with number ' + igmNumber + ' already exists in the system');
				return res.view('pages/imlost', {error: 'IGM with number ' + igmNumber + ' already exists in the system'});
			} else {
				let igmPending = await IgmPending.create({
					igm_number: igmNumber,
					igm_date: igmDate,
					flight_number: igmFlightNumber,
					flight_date: igmDate,
					inward_date: inwardDate,
					uploaded_by: req.user.username,
					igm_city: igmCity,
					status: 'pending'
				}).fetch();
				
				console.log('' + sails.config.custom.base_url + '/approveigm/' + igmPending.id  + '');
				
				let igm_information_html = '<h3>Create FFM Information</h3>'
				igm_information_html += '<p>Uploaded By - ' + req.user.username + ' / ' + igmCity + '</p>' + 
				'<p>IGM Date = ' + sails.config.custom.getReadableDate(igmDate) + '</p>' + 
				'<p>Flight - ' + igmFlightNumber + ' / ' + sails.config.custom.getReadableDate(igmDate) + '</p>';

				let approve_decline_html = '<h3><a href="' + sails.config.custom.base_url + '/approveigm/' + igmPending.id  + '">Click to Approve</a></h3><h3><a href="' + sails.config.custom.base_url + '/declineigm/' + igmPending.id  + '">Click to Decline</a></h3>';
				
				await sails.helpers.sendEmail.with({
					to: cityConstant.approval_manager_email,
					subject: '' + igmNumber + ' - New IGM uploaded',
					html: igm_information_html + approve_decline_html
				});
				
				
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', 'igm created manually and redirected to igm page');
				return res.redirect('/igm?inwardcargo_igm_city=' + req.body.inwardcargo_igm_city + '&ty_msg=1');
			}
		} else if (req.body.inwardcargo_igm_createoption == 'inwardcargo_igm_createoption_pick_from_available') {
			let id = req.body.inwardcargo_igm_upload_select_igm_from_available_igm;
			
			let igmPending = await IgmPending.findOne({id: id});
			if(!igmPending) {
				res.view('pages/imlost', {error: 'This action is not allowed'});
				return;
			}

			if(igmPending.status === 'available') {
				let response = await sails.helpers.parseIgm.with({igm_filepath: igmPending.filepath.slice(1) /*TO REMOVE 1st FRONT SLASH*/, username: req.user.username, igmCity: igmCity, igmNumber: igmNumber, igmDate: igmDate, inwardDate: inwardDate, flightNumber: igmPending.flight_number});

				if(!response.err) {
					await IgmPending.update({id: id}).set({status: 'used'});
					return res.redirect('/igm?inwardcargo_igm_city=' + req.body.inwardcargo_igm_city + '&inwardcargo_igm_no_date=' + req.body.inwardcargo_igm_number + '&inwardcargo_igm_search_date=' + req.body.inwardcargo_igm_inward_date);
				} else {
					res.view('pages/imlost', {error: 'There is an error while parsing the IGM file'});
				}
			} else {
				res.view('pages/imlost', {error: 'The file is already ' + igmPending.status});
			}
		}
	},
	
	getigmlist: function(req, res) {
		var city = req.query.inwardcargo_igm_city;
		var igmno = req.query.inwardcargo_igm_no_date;
		var ty_msg = req.query.ty_msg;
		var startOfDayToday = new Date().setHours(0,0,0,0);
		var endOfDayToday = new Date().setHours(23,59,59,999);
		var igmsearchstartdate = (req.query.inwardcargo_igm_search_date) ? new Date(Date.parse(req.query.inwardcargo_igm_search_date)).setHours(0,0,0,0) : startOfDayToday;
		var igmsearchenddate = (req.query.inwardcargo_igm_search_date) ? new Date(Date.parse(req.query.inwardcargo_igm_search_date)).setHours(23,59,59,999) : endOfDayToday;
		var flightNumber = undefined;
		sails.config.globals.async.waterfall([
			function(callback) {
				Ports.find({ where: {
					and : [
						{ "is_inward_port" : true },
						{ iata_code: req.user.iata_code }
					]
				}, sort: 'iata_code'}, function(err, ports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
						callback('something went wrong while finding airports', null, null, null, null, null, null, null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
						callback(null, ports);
					}
				});
			},function (ports, callback) {
				if(ports === undefined || ports.length === 0) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
					callback(null, ports, undefined);
				} else {
					if(city === undefined)
						city=ports[0].iata_code;
					Igm.find({ where: {
						and : [
										{ inward_date: { '>=': igmsearchstartdate }},
										{ inward_date: { '<=': igmsearchenddate }},
										{igm_city: city}
									]
								}, sort: 'createdAt DESC' }, function(err, igms) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
							callback('error finding igm', null, null, null, null, null, null, null);
						} else {
							if(igms != undefined && igms != null && igms != '') {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '3');
								callback(null, ports, igms);
							} else {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '4');
								callback(null, ports, []);
							}
						}
					});
				}
			}, function (ports, igms, callback) {
				if(igms && igms.length > 0) {
					if(igmno === undefined)
						igmno=igms[0].igm_number;

					PartAwb.find({igm_number: igmno, void_on: 0}, function(err, part_awbs) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
							callback('error finding parts of awb', null, null, null, null, null, null, null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '5');
							callback(null, ports, igms, part_awbs);
						}
					});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '6');
					callback(null, ports, igms, []);
				}
			},function(ports, igms, part_awbs, callback){
				if(igms && igms.length > 0) {
					Igm.find({igm_number: igmno}, function(err, singleIgm) {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
							callback('error finding igm', null, null, null, null, null, null, null);
						} else {
							flightNumber = singleIgm[0].flight_number;
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '7');
							callback(null, ports, igms, part_awbs);
						}
					});
				} else {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '8');
					callback(null, ports, igms, []);
				}
			}, function (ports, igms, part_awbs, callback) {
				var awb_ids = [];
				for(var i = 0; i < part_awbs.length; i++)
					awb_ids.push(part_awbs[i].awb_number);

				if(awb_ids.length == 0) {
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '9');
					callback(null, ports, igms, part_awbs, []);
				} else {
					AwbUserData.find({
						and : [
							{awb_number: awb_ids},
							{void_on: 0}
						]
					}
					, function(err, awb_user_datas){
						if(err || awb_user_datas == undefined || awb_user_datas == null) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
							callback('error in finding awbs', null, null, null, null, null, null, null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '10');
							callback(null, ports, igms, part_awbs, awb_user_datas);
						}
					});
				}
			},function(ports, igms, part_awbs, awb_user_datas, callback) {
				Ports.find({ where: {}, sort: 'iata_code'}, function(err, allports) {
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
						callback('something went wrong while finding all airports', null, null, null, null, null, null, null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '11');
						callback(null, ports, igms, part_awbs, awb_user_datas, allports);
					}
				});
			},async function(ports, igms, part_awbs, awb_user_datas, allports, callback) {
				let _7_days_ago = (new Date()).setDate(new Date().getDate() - 7);
				
				let pending_igms = await IgmPending.find({igm_city: city, status: 'available', flight_date: {'>': _7_days_ago}});
				let pending_request_igms = await IgmPending.find({igm_city: city, status: 'pending'});
				callback(null, ports, igms, part_awbs, awb_user_datas, allports, pending_igms, pending_request_igms);
			}
		], function(err, ports, igms, part_awbs, awb_user_datas, allports, pending_igms, pending_request_igms) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getigmlist - get)' + err);
				return res.view('pages/imlost', {error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '12');
				return res.view('pages/igm',{ pending_request_igms: pending_request_igms, pending_igms: pending_igms, airportlistdetails: ports, allairportlistdetails: allports, cityCode:city, igmlist: igms, selectedIgm: igmno,flightNumber: flightNumber, partawblist: part_awbs, awb_user_datas: awb_user_datas, flash_message: (ty_msg==1) ? 'Your IGM is submitted for approval' : ''});
			}
		});
	},
	searchusingigmno: function(req, res) {
		var igmNumber = req.body.inwardcargo_igm_search_igmnumber_input;
		Igm.findOne({igm_number: igmNumber}, function(err, igm){
			if(err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (searchusingigmno - post)' + err);
				return res.send({error: 'Could not find the IGM'});
			} else {
				if(igm) {
					var igmdate = new Date(igm.inward_date).setHours(0,0,0,0);
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
					return res.send({inwardcargo_igm_no_date: igmNumber, inwardcargo_igm_city: igm.igm_city, igm_date: igmdate});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (searchusingigmno - post)' + 'Could not find the IGM');
					return res.send({error: 'Could not find the IGM'});
				}
			}
		});
	},
	saveawbmanually: function (req, res) {
		var awbNumber = req.body.inwardcargo_igm_add_awb_manually_awb_number_input;
		var igmNumber = req.body.inwardcargo_igm_add_awb_manually_igm_number_input;
		var awbOrigin = req.body.inwardcargo_igm_add_awb_manually_origin_input;
		var awbDestination = req.body.inwardcargo_igm_add_awb_manually_destination_input;
		var igmCity = req.body.inwardcargo_igm_add_awb_manually_igm_city_input;
		var flightNumber = req.body.inwardcargo_igm_add_awb_manually_flight_number_input;
		var numberofPiecesReceived = req.body.inwardcargo_igm_add_awb_manually_no_of_pieces_received_input;
		var weightReceived = req.body.inwardcargo_igm_add_awb_manually_weight_received_input;
		var commodity = req.body.inwardcargo_igm_add_awb_manually_commodity_input;
		var inwardDate = req.body.inwardcargo_igm_add_awb_manually_inwarddate_input;
		sails.config.globals.async.waterfall([
			function(callback) {
				var part_awb = {};
				part_awb.awb_number = awbNumber;
				part_awb.igm_number = igmNumber;
				part_awb.origin = awbOrigin;
				part_awb.destination = awbDestination;
				part_awb.igm_city = igmCity;
				part_awb.flight_number = flightNumber;
				part_awb.no_of_pieces_received = Number(numberofPiecesReceived);
				part_awb.weight_received = Number(weightReceived);
				part_awb.commodity = commodity;
				part_awb.inward_date = Date.parse(inwardDate);
				part_awb.flight_date = Date.parse(inwardDate);
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
				PartAwb.create(part_awb).fetch().exec(function (err, part_awb_result) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (saveawbmanually - post)' + err);
						callback('Error adding single PartAwb', null);
					} else {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
						callback(null, true);
					}
				});
			},function(part_awb_result, callback){
				var awb = {};
				awb.awb_number = awbNumber;
				awb.origin = awbOrigin;
				awb.destination = awbDestination;
				awb.awb_city = igmCity;
				Awb.findOrCreate({awb_number: awbNumber}, awb)
				.exec(function(err, awb_response, wasCreated) {
					if(wasCreated) {
						sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
						AwbUserData.create({awb_number: awb.awb_number, igm_city: igmCity}).fetch().exec(function(err, awb_user_data) {
							if(err) {
								sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (saveawbmanually - post)' + err);
								callback('Error in creating awb user data');
							} else {
								if(awb_user_data) {
									sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
									callback(null, true);
								} else {
									callback('Could not create awb user data');
								}
							}
						});
					} else {
						if(err) {
							if (err.code == 'E_UNIQUE') {
								sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
								//	the duplicate object
								callback(null, true);
							} else {
								callback('Error adding single AWB', null);
							}
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
							callback(null, true);
						}
					}
				});
			}
		],function(err, awbcreateresult){
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (saveawbmanually - post)' + err);
				return res.send({error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '7');
				return res.send({value: awbcreateresult});
			}
		});
	},
	getreasonsforchangeigm: function(req, res) {
		var reason_select = req.query.selected_reason;
		Reasons.find({reason_type: reason_select, make_it_visible:true}, function(err, reasons) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonsforchangeigm - get)' + err);
				return res.send({error: 'Something Happens During Finding Reasons'});
			} else {
				if (reasons != undefined || reasons != null){
					sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
					return res.send({value: reasons});
				} else {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getreasonsforchangeigm - get)' + 'Something Happens During finding the reason');
					return res.send({error: 'Something Happens During finding the reason'});
				}
			}
		});
	},
	changeigmnumber: function(req, res) {
		var igmNumber = req.body.inwardcargo_igm_igm_number;
		var newIgmNumber = req.body.inwardcargo_new_igm_number;
		var confirmIgmNumber = req.body.inwardcargo_confirm_igm_number;
		var selected_reason = req.body.selected_reason;
		var user_typed_reason = req.body.user_typed_reason;
		sails.config.globals.async.waterfall([
			function(callback) {
				Igm.findOne({igm_number: newIgmNumber}, function(err, igm) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
						callback('error finding igm with new number', null);
					} else {
						if(igm) {
							callback('The new IGM number already exists. Please provide unique IGM number', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '1');
							callback(null);
						}
					}
				});
			},
			function(callback) {
				Igm.findOne({igm_number: igmNumber}, function(err, igm) {
					if(err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
						callback('error finding igm', null);
					} else {
						if(igm) {
							igm.igm_number = newIgmNumber;
							igm.change_history.push({selected_reason: selected_reason, user_typed_reason: '' + igmNumber + ' to ' + newIgmNumber + ' - ' + new Date() + ' - ' + user_typed_reason});
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '2');
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
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
							callback('Something Happens During Updating Igm', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '3');
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
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
							callback('error finding parts of awb', null);
						} else {
							sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '4');
							async.each(part_awbs, function(part_awb, callback) {
								PartAwb.update({igm_number: part_awb.igm_number}, {igm_number: newIgmNumber}).fetch()
									.exec(function(err, updatedPartAwb){
										if (err) {
											sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
											callback('Something Happens During Updating Part Awb');
										} else {
											sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '5');
											callback();
										}
									});
							}, function(err) {
							    // if any of the file processing produced an error, err would equal that error
							    if( err ) {
										sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
							      // One of the iterations produced an error.
							      // All processing will now stop.
							      callback(err, null);
							    } else {
										sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '6');
							      callback(null, true);
							    }
							});
						}
					});
			}
		],function(err, changeigmresult) {
			if (err) {
				sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (changeigmnumber - post)' + err);
				return res.send({error: err});
			} else {
				sails.config.globals.putinfolog(req.user.username, req.options.action, 'post', '7');
				return res.send({value: changeigmresult});
			}
		});
	},
	
	getigm: async function(req, res) {
		let id = req.params.id;
		let igmPending = await IgmPending.findOne({id: id});
		res.attachment(igmPending.filepath);
		res.send();
	},
	approveigm: async function(req, res) {
		let id = req.params.id;
		let igmPending = await IgmPending.findOne({id: id});
		
		if(!igmPending) {
			res.view('pages/imlost', {error: 'This action is not allowed'});
			return;
		}
		
		if(igmPending.status === 'pending') {
			let response = await sails.helpers.parseIgm.with({igm_filepath: igmPending.filepath.slice(1), username: 'approval process', igmCity: igmPending.igm_city, igmNumber: igmPending.igm_number, igmDate: igmPending.igm_date, inwardDate: igmPending.inward_date, flightNumber: igmPending.flight_number});
			
			if(!response.err) {
				await IgmPending.update({id: id}).set({status: 'used'});
				res.send('Thank You!, the file is approved and parsed');
			} else {
				console.log(response.err);
				res.send('There is an error while parsing the IGM file');
			}
		} else {
			res.send('The file is already ' + igmPending.status);
		}
	},
	declineigm: async function(req, res) {
		let id = req.params.id;
		let igmPending = await IgmPending.findOne({id: id});
		
		if(!igmPending) {
			res.view('pages/imlost', {error: 'This action is not allowed'});
			return;
		}
		
		if(igmPending.status === 'pending') {
			await IgmPending.update({id: id}).set({status: 'declined'});
			res.send('Thank You!, the file is rejected');
		} else {
			res.send('The file is already ' + igmPending.status);
		}
	},
};

function getTimestampfromDateWithTime(datewithtime) {
	var sliptdate = voca.split(datewithtime, ' ');
	var makewithoutcolon = sliptdate[1].replace(/:/g,'');
	var year = Number(voca.splice(sliptdate[0], 0, 4));
	var month = (Number(voca.splice(sliptdate[0], 0, 2)) - year)/10000;
	var day = (Number(sliptdate[0]) - ((month*10000)+ (year)))/1000000;
	var minute = Number(voca.splice(makewithoutcolon, 0, 2));
	var hour = (Number(makewithoutcolon-minute)/100);
	return new Date(year, month-1, day , hour, minute);
}
function getTimestampfromDate(date) {
	var year = Number(voca.splice(date, 0, 4));
	var month = (Number(voca.splice(date, 0, 2)) - year)/10000;
	var day = (Number(date) - ((month*10000)+ (year)))/1000000;

	return new Date(year, month-1, day);
}
function getTimestampfromDateAndTime(date, time) {
	var year = Number(voca.substring(date, 0, 4));
	var month = Number(voca.substring(date, 4, 6));
	var day = Number(voca.substr(date,6));
	var minute = Number(voca.splice(time, 0, 2));
	var hour = (Number(time-minute)/100);

	return new Date(year, month-1, day , hour, minute);
}
