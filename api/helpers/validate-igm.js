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
		var readline = require('readline');
		var fs = require('fs');

		var igm_details = {};
		var igm_parsed_json = [];
		var igm_parsed_mawb_json = [];
		var igm_parsed_part_awb_json = [];

		//	If there is a file that needs parsing then follow this path
		if(inputs.igm_filepath) {
			//var input = fs.createReadStream(igmDirPath+'/'+tempFileName);
			var input = fs.createReadStream(inputs.igm_filepath);
			var myInterface = readline.createInterface({
				input: input,
			});
			var token ='';
			var igm_id = undefined;
			var igm_city_valid_as_selected = false;

			input.on('end', function (line) {
				myInterface.close();
				if(igm_city_valid_as_selected) {
					sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'parsing of igm file is completed');
					exits.success({
						igm_parsed_json: igm_parsed_json, 
						igm_parsed_mawb_json: igm_parsed_mawb_json, 
						igm_parsed_part_awb_json: igm_parsed_part_awb_json,
					});
				} else {
					sails.log.error(inputs.username + ' - ' + new Date() +' ERR - (igmupload - post)' + 'Uploaded IGM does not belongs to ' + inputs.igmCity);
					exits.success({err: 'Uploaded IGM does not belongs to ' + inputs.igmCity});
				}
			});

			myInterface.on('line', async function (line) {
				var split = voca.split(line, token);
				//	Based on the length of split, we will know the TYPE of the row
				//	Based on the TYPE of the row, we will read the specific index of the split for the TYPE object

				switch (split.length) {
					case 12:
						igm_details.igm_date = new Date(inputs.igmDate).getTime();
						//	need to convert it into timestamp
						igm_details.igm_number = inputs.igmNumber;
						//	currently assumming it to be unique. awaiting BA response.
						break;
					case 11:	//	This is line 4
						igm_details.flight_date = new Date(inputs.igmDate).getTime();//getTimestampfromDate(split[3]).getTime();
						igm_details.inward_date = new Date(inputs.inwardDate).getTime();
						igm_details.uploaded_by = inputs.username;
						igm_details.igm_city = inputs.igmCity;
						igm_details.flight_number = split[2];
						igm_parsed_json.push(igm_details);

						if(inputs.igmCity === split[6])
							igm_city_valid_as_selected = true;

						/*Igm.create(igm_details).fetch().exec(function (err, result) {
							console.log("********** " + result.id);
							igm_id = result.id;
							//	Now we know the id of the saved IGM, we should be able to resume the file parsing and use IGM id.
							input.resume();
						});*/
						break;
					case 15:	//	This is AWB line
						/*if(split[8] === inputs.igmCity)*/ {
							var awb = {};
							var awb_number = split[5];
							//	Check if the AWB number has already occured during the current parsing of the file.
							//	If it has already occured, then we should be able to merge the data

							var already_occured = false;
							var i = 0
							for(; i < igm_parsed_mawb_json.length; i++) {
								if(awb_number === igm_parsed_mawb_json[i].awb_number) {
									already_occured = true;
									break;
								}
							}

							//	Add new AWB if it did not occur already
							if(already_occured) {
								var j = 0;
								for(; j < igm_parsed_part_awb_json.length; j++) {
									if(igm_parsed_part_awb_json[j].awb_number === awb_number) {
										igm_parsed_part_awb_json[j].no_of_pieces_received += Number(split[10]);
										igm_parsed_part_awb_json[j].weight_received += Number(split[11]);
										break;
									}
								}
							} else {
								awb.awb_number = awb_number;
								awb.origin = split[7];
								awb.destination = split[8];
								awb.awb_city = inputs.igmCity;
								igm_parsed_mawb_json.push(awb);

								var part_awb = {};
								part_awb.awb_number = split[5];
								part_awb.igm_number = inputs.igmNumber;
								part_awb.origin = split[7];
								part_awb.destination = split[8];
								part_awb.igm_city = inputs.igmCity;
								part_awb.flight_number = split[2];
								part_awb.flight_date = new Date(inputs.igmDate).getTime();
								part_awb.inward_date = new Date(inputs.inwardDate).getTime();;
								part_awb.no_of_pieces_received = Number(split[10]);
								part_awb.weight_received = Number(split[11]);
								part_awb.commodity = split[12];
								igm_parsed_part_awb_json.push(part_awb);
							}
						}/* else {
							()
							await Transhipment.create({
								igm_city: inputs.igmCity,
								awb_number: split[5],
								source: split[7],
								destination: split[8],
								igm_no_rx: inputs.igmNumber,
								flight_no_rx: split[2],
								no_of_pieces_rx: Number(split[10]),
								weight_tx: Number(split[11]),
								commodity: split[12]
							});
						}*/

						break;
				}
			});
		} else {
			igm_details.igm_date = new Date(inputs.igmDate).getTime();
			igm_details.igm_number = inputs.igmNumber;
			igm_details.flight_date = new Date(inputs.igmDate).getTime();//getTimestampfromDate(split[3]).getTime();
			igm_details.inward_date = new Date(inputs.inwardDate).getTime();
			igm_details.uploaded_by = inputs.username;
			igm_details.igm_city = inputs.igmCity;
			igm_details.flight_number = inputs.flightNumber;

			igm_parsed_json.push(igm_details);

			sails.config.globals.putinfolog(inputs.username, 'reading igm file', 'post', 'There is no file to parse (probably manual IGM created)');
			exits.success({
				igm_parsed_json: igm_parsed_json, 
				igm_parsed_mawb_json: igm_parsed_mawb_json, 
				igm_parsed_part_awb_json: igm_parsed_part_awb_json
			});
		}
	}
};
