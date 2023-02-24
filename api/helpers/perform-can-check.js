module.exports = {

	friendlyName: 'Perform can check',

	description: '',

	inputs: {
		igm_no: {type: 'string'},
	},

	exits: {
		success: {
			description: 'All done.',
		},

	},

	fn: async function (inputs, exits) {
		sails.config.log.addINlog('helper', `IN - perform-can-check for ${JSON.stringify(inputs)}`);
		if(!inputs.igm_no) {
			sails.config.log.addlog(0, 'helper', 'perform-can-check', "Please provide igm no.");
			sails.config.log.addINlog('helper', `OUT - perform-can-check`);
			return exits.success(sails.config.custom.jsonResponse("Please provide igm no.", null));
		}

		let igm = await Igm.findOne({igm_number: inputs.igm_no});
		if(!igm) {
			sails.config.log.addlog(0, 'helper', 'perform-can-check', `No IGM found for igm no. ${inputs.igm_no}`);
			sails.config.log.addINlog('helper', `OUT - perform-can-check`);
			return exits.success(sails.config.custom.jsonResponse(`No IGM found for igm no. ${inputs.igm_no}`, null));
		}

		let parts = await PartAwb.find({igm_number: inputs.igm_no, void_on: 0});
		let out = [];
		let send_email = true;
		let bodyPart = "";
		for(let i = 0; i< parts.length; i++) {

			if(!parts[i].can_document) {
				sails.config.log.addlog(0, 'helper', 'perform-can-check', `AWB ${parts[i].awb_number} is yet to have its CAN sent`);
				send_email = false;
				break;
			} else {
				let awb_user_data = await AwbUserData.findOne({awb_number: parts[i].awb_number, void_on: 0});
				let consignee = "";

				if(!awb_user_data) {
					sails.config.log.addlog(0, 'helper', 'perform-can-check', 'There is no customer linked to the AWB yet');
					send_email = false;
					break;
				} else {
					consignee = `${awb_user_data.consignee_name}`;
				}
				
				if(parts[i].can_email_sent == false) {
					out.push({
						awb_no: parts[i].awb_number,
						consignee: consignee,
						origin: parts[i].origin,
						destination: parts[i].destination,
						flight_number: parts[i].flight_number,
						pieces: parts[i].no_of_pieces_received,
						weight: parts[i].weight_received,
						//can: parts[i].can_document,
						//can_email_sent: parts[i].can_email_sent,
					})
					bodyPart += `
						<tr>
							<td>${parts[i].awb_number}</td>
							<td>${consignee}</td>
							<td>${parts[i].origin} - ${parts[i].destination}</td>
							<td>${parts[i].flight_number}</td>
							<td>${parts[i].no_of_pieces_received}</td>
							<td>${parts[i].weight_received} kg</td>
						</tr>
					`
				}
			}

		}

		//console.table(out);
		sails.config.log.addlog(0, 'helper', 'perform-can-check', `Send EMAIL = ${send_email}`);
		if(send_email == true) {
			if(out.length == 0) {
				sails.config.log.addlog(0, 'helper', 'perform-can-check', 'IGM is complete and there are no AWB to report')
			} else {
				sails.config.log.addlog(0, 'helper', 'perform-can-check', 'SENDING EMAIL NOW');
				let body = `
				<div>
					<p>Following are the AWBs of <strong>IGM-${inputs.igm_no}</strong> whose CAN are issued but the email is not sent to the consignee for not having their email address in the system</p>
					<table>
						<tr>
							<th>AWB No.</th>
							<th>Consignee</th>
							<th>Route</th>
							<th>Flight No</th>
							<th>Pieces</th>
							<th>Weight</th>
						</tr>
						${bodyPart}
					</table>
				</div>`;

				let now = Date.now();
				let cityConstant = await CityConstants.findOne({
					where : {
						iata_code: igm.igm_city,
						expires_on: { '>': now },
						effective_from: { '<': now }
					},
				});

				if(cityConstant.line_manager_email) {
					await sails.helpers.sendEmail.with({
						to: cityConstant.line_manager_email,
						//bcc: inputs.bcc,
						subject: `IGM - ${inputs.igm_no} - ${parts.length} CANs Issued - ${out.length} affected`,
						html: body
					})
				} else {
					sails.config.log.addlog(0, 'helper', 'perform-can-check', `No line manager found for igm no. ${inputs.igm_no} at station ${igm.igm_city} to send email`);
				}
			}
		}

		sails.config.log.addINlog('helper', `OUT - perform-can-check`);
		return exits.success(sails.config.custom.jsonResponse(null, true));
	}
};

