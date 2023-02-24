const axios = require('axios').default;

module.exports = {

	friendlyName: 'Get auth tokens',

	description: '',

	inputs: {
		for: {type: 'string', isIn: Object.keys(sails.config.custom.email_credentials_for), required: true},
		code: {type: 'string'},
	},

  	exits: {
		success: {
			outputFriendlyName: 'Auth tokens',
		},
  	},

  	fn: async function (inputs, exits) {

		const url = require('url');

		let email_credentials_for = sails.config.custom.email_credentials_for[inputs.for];

		let email = email_credentials_for.email;                      //'support@vnops.in';//C0nne(tOPSN0W!
		let application_id = email_credentials_for.application_id;             //'20985dfa-4c0c-4302-a7c9-cecc433ff1bf';
		let client_id = email_credentials_for.client_id;                  //'20985dfa-4c0c-4302-a7c9-cecc433ff1bf';
		let object_id = email_credentials_for.object_id;                  //'3d2cd215-608d-42aa-a8bf-f45ff394e2db';
		let tenant_id = email_credentials_for.tenant_id;                  //'17366dcf-32a3-4ae7-803b-7c2bd8540990';
		let client_secret = email_credentials_for.client_secret;              //'nHi8Q~mu3UmoAUC.kIk__AgYigdIEuvaCWjZ-bNE';

		let params = {
			client_secret: client_secret,
			client_id: client_id,
			scope: 'https://outlook.office.com/.default',//'openid%20offline_access%20https%3a%2f%2foutlook.office.com%2fIMAP.AccessAsUser.All',//"api://a94f11ec-365e-4208-ace4-c31c35506f73/IMAP.AccessAsUser.All",
			redirect_uri: `${sails.config.custom.base_url}${email_credentials_for.redirect_url}`,
		};

		//	If we have received inputs.code, in that case we will be generating the fresh tokens
		//	If we have not received inputs.code, in that case we will check if we already have access-token
		//	If the access-token is available, then perform refresh-token process (here we do not care if the token has expired or not expired. Since request is made to generate the tokens it will perform the generation using refresh token flow)
		//	If the generation of token has been successful, save them into the database and return 

		////
		if(inputs.code) {	//	We have to get the new tokens. Must honor the received code.
			params.code = inputs.code;
			params.grant_type = 'authorization_code';//"client_credentials",
			console.log('--- we will fetch new tokens using the received code ---')
		} else {	//	 here we should check if there is need for calling refresh token by checking the expiry
			console.log('--- we will refresh the tokens ---')
			let access_token_expiry = await Settings.findOne({key: email_credentials_for.access_token_expiry_name});
			if(!access_token_expiry || (access_token_expiry.value > (Date.now() + 60000))) {
				console.log("There is no need to obtain new tokens.");
				return exits.success(sails.config.custom.jsonResponse(null, null));
			}
			let refresh_token = await Settings.findOne({key: email_credentials_for.refresh_token_name});
			if(!refresh_token || !(refresh_token.value)) {
				return exits.success(sails.config.custom.jsonResponse("There is no token available.", null));
			}
			params.refresh_token = refresh_token.value;
			params.grant_type = "refresh_token";
		}
		////

		//return exits.success(sails.config.custom.jsonResponse('We should not have reached here'));

		// let hard_refresh = true;
		// let access_token = await Settings.count({key: email_credentials_for.access_token_name});
		// if(access_token == 1) {
		// 	hard_refresh = false;
		// }
			
		// if(hard_refresh) {
		// 	params.code = inputs.code;
		// 	params.grant_type = 'authorization_code';//"client_credentials",
		// } else {
		// 	let refresh_token = await Settings.findOne({key: email_credentials_for.refresh_token_name});
		// 	if(!refresh_token || !(refresh_token.value)) {
		// 		return exits.success(sails.config.custom.jsonResponse("There is no token available.", null));
		// 	}
		// 	params.refresh_token = refresh_token.value;
		// 	params.grant_type = "refresh_token";
		// }

		const urlSearchParams = new url.URLSearchParams(params);
		
		console.log('calling for token with params = ', urlSearchParams);

		try{
			axios.post(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, urlSearchParams.toString(), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then(async (response) => {
				//console.log('axios response', response.data);
				
				//let base64str = Buffer.from(`user=${email}${Buffer.from('01', 'hex').toString('ascii')}auth=${response.data.token_type} ${response.data.access_token}${Buffer.from('0101', 'hex').toString('ascii')}`).toString('base64');
				let email_credentials_for_access_token_name = await Settings.findOne({key: email_credentials_for.access_token_name})
				if(email_credentials_for_access_token_name) {
					await Settings.update({key: email_credentials_for.access_token_name}).set({value: response.data.access_token});
				} else {
					await Settings.create({key: email_credentials_for.access_token_name, value: response.data.access_token});
				}

				let email_credentials_for_refresh_token_name = await Settings.findOne({key: email_credentials_for.refresh_token_name})
				if(email_credentials_for_refresh_token_name) {
					await Settings.update({key: email_credentials_for.refresh_token_name}).set({value: response.data.refresh_token});
				} else {
					await Settings.create({key: email_credentials_for.refresh_token_name, value: response.data.refresh_token});
				}

				let email_credentials_for_access_token_expiry_name = await Settings.findOne({key: email_credentials_for.access_token_expiry_name})
				if(email_credentials_for_access_token_expiry_name) {
					await Settings.update({key: email_credentials_for.access_token_expiry_name}).set({value: (Date.now() + (response.data.expires_in * 1000))});
				} else {
					await Settings.create({key: email_credentials_for.access_token_expiry_name, value: (Date.now() + (response.data.expires_in * 1000))});
				}
				
				exits.success(sails.config.custom.jsonResponse(null, response.data));
			}).catch(e => {
				console.error('error', e);
				exits.success(sails.config.custom.jsonResponse(e, null));
			});
		} catch (e) {
			console.log('error in catch', e);
			exits.success(sails.config.custom.jsonResponse(JSON.stringify(e), null));
		}
	}

};

