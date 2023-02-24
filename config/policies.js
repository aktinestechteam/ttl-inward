/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/
	
  // '*': true,
	'security/grant-csrf-token' : ['authenticated', "refreshSessionCookie"],
	'auth': true,
	'index' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'admin/airportlist' : {
		'*' : ["authenticated", "isAdmin", "refreshSessionCookie"],
		'addairports': false
	},
	'admin/user' : {
		'*' : ["authenticated", "isAdmin"]
	},
	'admin/consignees' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'admin/constants' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'admin/exchangerateslist' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'admin/gstcodes' : {
		'*' : ["authenticated", "isAdmin", "refreshSessionCookie"]
	},
	'admin/reasons' : {
		'*' : ["authenticated", "isAdmin", "refreshSessionCookie"]
	},
	'user/awb' : {
		'*' : ["authenticated", "refreshSessionCookie"],
		'approvepartawbdeletion': true,
		'declinepartawbdeletion': true
	},
	'user/igm' : {
		'*' : ["authenticated", "refreshSessionCookie"],
		'getigm': true,
		'approveigm': true,
		'declineigm': true,
	},
	'admin/scannedffm' : {
		'*' : ["authenticated", "refreshSessionCookie"],
	},
	'transhipment' : {
		'*' : ["authenticated", "refreshSessionCookie"],
	},
	'challan' : {
		'*' : ["authenticated", "refreshSessionCookie"],
	},
	'can' : {
		'*' : ["authenticated", "refreshSessionCookie"],
		'can': true,
		'canpdf': false
	},
	'dcm' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'do' : {
		'*' : ["authenticated", "refreshSessionCookie"]
	},
	'invoice' : {
		'*' : ["authenticated", "refreshSessionCookie"],
		'invoice': true,
		'invoice2pdf': false,
		'invoicepdf': false,

	},
	'dailyreports' : {
		'*' : ["authenticated", "refreshSessionCookie"],
		'getxls': false
	},
	'azure/AzureController': {
		'*': true
	}
};
