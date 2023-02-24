/**
 * CityConstants.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

	iata_code: 				            {type: 'string', required: true},
	registered_address: 	            {type: 'string'},
	delivery_address: 		            {type: 'string'},
	bank_address: 			            {type: 'string'},
	bank_ifsc: 			            	{type: 'string', defaultsTo: 'NA'},
	customs_address: 		            {type: 'string'},

	collect_fees_min_usd: 			  	{type: 'number', required: true},
    collect_fees_percentage: 		   	{type: 'number', required: true},
    delivery_order_charge: 				{type: 'number', required: true},
    delivery_order_charge_baggage: 		{type: 'number', required: true},

	cartage_charge_min: 				{type: 'number', required: true},
    cartage_charge_min_weight: 			{type: 'number', required: true},
    cartage_charge_per_kg:  			{type: 'number', required: true},

	miscellaneous_charges:   			{type: 'number', required: true},

	break_bulk_charges: 				{type: 'number', required: true},
	direct_delivery_charges:			{type: 'number', required: true},

	gstin_number: 						{type: 'string', required: true},
    igst_percentage: 					{type: 'number', required: true},
    cgst_percentage: 					{type: 'number', required: true},
    sgst_percentage: 					{type: 'number', required: true},
    hsn: 								{type: 'string'},

    tds_allow: 							{type: 'boolean', defaultsTo: false},
    tds_percentage: 					{type: 'number', defaultsTo: 10},
    tds_applied_on: 					{type: 'string', defaultsTo: 'net'},//(net* / gross)

	signatory: 							{type: 'string'},
    designation: 						{type: 'string'},
    can_front: 							{type: 'json'},
    can_back: 							{type: 'json'},

	effective_from: 					{type: 'number', required: true},
    expires_on: 			            {type: 'number', defaultsTo: sails.config.globals.expires_at_infinity},//	infinite - means currently active

	//	CHQREQ values
	gst_budget_code:					{type: 'string'},
	gst_budget_account:					{type: 'string'},
	approved_by:						{type: 'string'},
	approver_title:						{type: 'string'},
	approver_email:						{type: 'string'},

	//	DCM
	intimation_email:					{type: 'string'},
	line_manager_email:					{type: 'string'},
	approval_manager_email:				{type: 'string', defaultsTo: ''}
  },
	/*beforeCreate: function(cityconstants, callback) {
		console.log(cityconstants.can_front);
		console.log(typeof cityconstants.can_front);
		console.log(cityconstants.can_back);
		console.log(typeof cityconstants.can_back)
		cityconstants.can_front = JSON.parse(cityconstants.can_front);
		cityconstants.can_back = JSON.parse(cityconstants.can_back);
		return callback();
	}*/
};
