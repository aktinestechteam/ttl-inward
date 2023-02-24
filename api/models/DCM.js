/**
 * DCM.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		dcm_number:				 	{type: 'string', unique: true/*, required: true*/},			//	SAME AS INVOICE NUMBER
		dcm_issue_date:				{type: 'number', defaultsTo: 0},						//	Date.now() on creation
		base_invoice_id:			{type: 'string', required: true},						//	object id of the invoice, eg. invoice.id
		awb_user_datas:				{type: 'json', columnType: 'array', required: true},	//	Array of awbUserData.id
		incorrect_amount:			{type: 'json', columnType: 'array', required: true},	//	Array of revised values
		correct_amount:				{type: 'json', columnType: 'array', required: true},	//	Array of revised values
		revised_total:				{type: 'number', required: true},
		dcm_reason:					{type: 'string'},

		consignee:					{type: 'string', required: true},
		invoiced_under_invoice_id:	{type: 'string'},

		igst:						{type: 'number', defaultsTo: 0},
		sgst:						{type: 'number', defaultsTo: 0},
		cgst:						{type: 'number', defaultsTo: 0},

		incorrect_igst:				{type: 'number', defaultsTo: 0},
		incorrect_sgst:				{type: 'number', defaultsTo: 0},
		incorrect_cgst:				{type: 'number', defaultsTo: 0},

		other_charges:				{type: 'number', defaultsTo: 0},
		incorrect_other_charges:	{type: 'number', defaultsTo: 0},

		void_on:					{type: 'number', defaultsTo: 0},
		void_by:					{type: 'string'},
		void_reason:				{type: 'string'},
		void_explanation:			{type: 'string'},

		generated_by:				{type: 'string', required: true},
	}
};
