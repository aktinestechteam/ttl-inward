/**
 * Invoice.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		invoice_number:				{type: 'string', unique: true/*, required: true*/},
		invoice_issue_date:			{type: 'number', defaultsTo: 0},
		awb_user_datas:				{type: 'json', columnType: 'array', required: true},
		challans:					{type: 'json', columnType: 'array', defaultsTo: []},
		dcms:						{type: 'json', columnType: 'array'},

		amount_billed:				{type: 'number', required: true},
		igm_city:					{type: 'string', required: true},

		void_on:					{type: 'number', defaultsTo: 0},
		void_by:					{type: 'string'},
		void_reason:				{type: 'string'},
		void_explanation:			{type: 'string'},

		payment_received_date:		{type: 'number', defaultsTo: 0},
		payment_amount:				{type: 'number'},
		payment_mode:				{type: 'string'},	//	CASH, CHQ, RTGS, NEFT, DD
		payment_reference_number:	{type: 'string'},
		payment_drawn_on:			{type: 'string'},
		payment_instrument_date:	{type: 'number'},

		dcm_document:				{type: 'string'},
		chqreq_document:			{type: 'string'},

		credit_period_from:			{type: 'number'},
		credit_period_to:			{type: 'number'},

		payment_comments: 			{type: 'string'},
		generated_by:				{type: 'string', required: true},
	}
};
