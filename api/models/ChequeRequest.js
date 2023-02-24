/**
 * DCM.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		dcm_number:					{type: 'string', unique: true/*, required: true*/},			//	SAME AS INVOICE NUMBER
		dcm_issue_date:				{type: 'number', defaultsTo: 0},						//	Date.now() on creation
		base_invoice_id:			{type: 'string', required: true},						//	object id of the invoice, eg. invoice.id
		awb_user_datas:				{type: 'json', columnType: 'array', required: true},	//	Array of awbUserData.id
		revised_amount:				{type: 'json', columnType: 'array', required: true},	//	Array of revised values

		consignee:					{type: 'string', required: true},
		//invoiced_under_invoice_id:	{type: 'string'},

		do_amount:					{type: 'number', defaultsTo: 0},
		igst:						{type: 'number', defaultsTo: 0},
		sgst:						{type: 'number', defaultsTo: 0},
		cgst:						{type: 'number', defaultsTo: 0},

		void_on:					{type: 'number', defaultsTo: 0},
		void_by:					{type: 'string'},
		void_reason:				{type: 'string'},
		void_explanation:			{type: 'string'},

		generated_by:				{type: 'string', required: true},
	}
};
