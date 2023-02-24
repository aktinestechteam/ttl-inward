/**
 * AzureController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	
	authenticate: async function(req, res) {
        //res.redirect(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/authorize?client_id=${client_id}&response_type=code&response_mode=query&scope=IMAP.AccessAsUser.All`);

        let email_credentials_for = sails.config.custom.email_credentials_for[req.query.for];

        if(!email_credentials_for) {
            return res.json(sails.config.custom.jsonResponse("*for* value supplied is not supported", null));
        }

        res.redirect(`https://login.microsoftonline.com/${email_credentials_for.tenant_id}/oauth2/v2.0/authorize?client_id=${email_credentials_for.client_id}&response_type=code&response_mode=query&scope=openid%20offline_access%20https%3a%2f%2foutlook.office.com%2fIMAP.AccessAsUser.All%20https%3a%2f%2foutlook.office.com%2fSMTP.Send&access_type=offline&inlude_granted_scope=true&redirect_uri=${sails.config.custom.base_url}${email_credentials_for.redirect_url}`);
    },

    handleReadEmailAuthentication: async function(req, res) {
        let code = req.query.code;
        console.log('redirect called for code = ', code);
        
        let token_response = await sails.helpers.azure.getAuthTokens.with({for: sails.config.custom.email_credentials_for.read_email.name, code: code});

        console.log('auth-redirect-read-email token_response', token_response);
        
        if(token_response.errormsg) {
            return res.json(token_response);
        }
        
        res.redirect('/azure/auth-done');
    },

    handleWriteEmailAuthentication: async function(req, res) {
        let code = req.query.code;
        console.log('auth-redirect-write-email called for code = ', code);
        
        let token_response = await sails.helpers.azure.getAuthTokens.with({for: sails.config.custom.email_credentials_for.write_email.name, code: code});

        console.log('auth-redirect-write-email token_response', token_response);
        
        if(token_response.errormsg) {
            return res.json(token_response);
        }
        
        res.redirect('/azure/auth-done');
    },

    tokenRefresh: async function(req, res) {
        //let refresh_token = await Settings.findOne({key: sails.config.custom.setting_keys.oauth_refresh_token.name});

        let email_credentials_for = sails.config.custom.email_credentials_for[req.query.for];

        if(!email_credentials_for) {
            return res.json(sails.config.custom.jsonResponse("*for* value supplied is not supported", null));
        }

        let token_response = await sails.helpers.azure.getAuthTokens.with({for: email_credentials_for.name});
        console.log('/azure/refresh-token', token_response);

        // await Settings.update({key: sails.config.custom.setting_keys.oauth_access_token.name}).set({value: token_response.data.access_token});
        // await Settings.update({key: sails.config.custom.setting_keys.oauth_refresh_token.name}).set({value: token_response.data.refresh_token});
        // await Settings.update({key: sails.config.custom.setting_keys.oauth_access_token_expiry.name}).set({value: (Date.now() + (token_response.data.expires_in * 1000))});

        if(token_response.errormsg) {
            return res.json(token_response);
        }
        
        res.redirect('/azure/auth-done');
    },
};

