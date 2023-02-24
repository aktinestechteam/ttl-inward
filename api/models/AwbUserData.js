/**
 * AwbUserData.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		awb_number: {
			type: 'string',
			required: true
		},

		//	User Inputs
		no_of_hawb: {
			type: 'number',
			defaultsTo: 0
		},

		consignee: {
			type: 'string'
		},
		consignee_name: {
			type: 'string'
		},
		consignee_address: {
			type: 'string'
		},
		consignee_address2: {
			type: 'string'
		},
		consignee_email: {
			type: 'string'
		},
		consignee_phone: {
			type: 'string'
		},
		consignee_pincode: {
			type: 'number'
		},
		consignee_state: {
			type: 'string'
		},
		consignee_gstn: {
			type: 'string'
		},
		consignee_is_sez: {
			type: 'boolean',
			defaultsTo: false
		},
		gst_exemption: {
			type: 'boolean',
			defaultsTo: false
		},
		consignee_type: {
			type: 'string'
		},
		consignee_credit_period: {
			type: 'string'
		},

		chargable_weight: {
			type: 'number'
		},

		collect_charges_type: {
			type: 'string',
			defaultsTo: 'PP'
		}, //	PP, CC, PPCC

		collect_weight_charge: {
			type: 'number'
		},
		collect_valuation_charge: {
			type: 'number'
		},
		collect_tax: {
			type: 'number'
		},
		collect_due_agent_charge: {
			type: 'number'
		},
		collect_due_carrier_charge: {
			type: 'number'
		},
		collect_currency_name: {
			type: 'string',
			defaultsTo: 'USD'
		},

		delivery_option: {
			type: 'string',
			defaultsTo: 'Normal'
		}, //	Normal, Baggage, Direct Delivery

		notify_type: {
			type: 'string',
			defaultsTo: 'None'
		}, //	None, Bank, Agent
		notify_address: {
			type: 'string'
		},
		bro_required: {
			type: 'boolean',
			defaultsTo: false
		},
		bro_received: {
			type: 'boolean',
			defaultsTo: false
		},

		expected_no_of_pieces: {
			type: 'number',
			defaultsTo: 0
		},
		expected_weight: {
			type: 'number',
			defaultsTo: 0
		},

		//	Fix Values
		//can_issue_date:          	{type: 'number', defaultsTo: 0},
		//do_issue_date:          	{type: 'number', defaultsTo: 0},
		do_document: {
			type: 'string'
		},
		invoice_document: {
			type: 'string'
		},

		//	Fix Charges From Constants
		do_charge: {
			type: 'number'
		},
		baggage_charge: {
			type: 'number'
		},
		direct_delivery_charge: {
			type: 'number'
		},
		misc_charges: {
			type: 'number'
		},
		hsn_code: {
			type: 'string'
		},
		gstin: {
			type: 'string'
		},
		tds_percentage: {
			type: 'number'
		},
		usd_to_local_applied: {
			type: 'number'
		},
		collect_currency_to_local: {
			type: 'number'
		},

		//	Calculated Values
		collect_fee: {
			type: 'number'
		}, //	This is higher between 5% or $10
		collect_charge: {
			type: 'number'
		},
		break_bulk_charge: {
			type: 'number'
		},
		cartage_charge: {
			type: 'number'
		},
		igst: {
			type: 'number'
		},
		cgst: {
			type: 'number'
		},
		sgst: {
			type: 'number'
		},

		tds_amount: {
			type: 'number'
		},

		//	values for invoices
		igm_city: {
			type: 'string',
			required: true
		},

		rate_reference_date: {
			type: 'number',
			defaultsTo: 0
		},
		void_on: {
			type: 'number',
			defaultsTo: 0
		},
	}
};