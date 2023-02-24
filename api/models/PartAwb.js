/**
 * PartAwb.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
        awb_number:             {type: 'string', required: true},
        igm_number:		        {type: 'string', required: true},
        origin:                 {type: 'string', required: true},
        destination:            {type: 'string', required: true},
        void_reason:            		{type: 'string'},
        void_explanation:            {type: 'string'},
        //no_of_hawb:				{type: 'number', defaultsTo: 0},

		igm_city:				{type: 'string'},

		flight_number:			{type: 'string'},
		inward_date:			{type: 'number', required: true},
		flight_date:			{type: 'number', required: true},

		no_of_pieces_received:	{type: 'number', defaultsTo: 0},
		weight_received:		{type: 'number', defaultsTo: 0},

		commodity:				{type: 'string'},

		can_document:			{type: 'string'},
		do_document:			{type: 'string'},
		first_can_issued:		{type: 'boolean', defaultsTo: false},
		can_email_sent:			{type: 'boolean', defaultsTo: false},
		//invoice_document:		{type: 'string'},

		part_awb_include_for_invoice: {type: 'boolean', defaultsTo: false},
		void_on:				{type: 'number', defaultsTo: 0},
		void_reason:			{type: 'string'}
		/*can_issued:				{type: 'boolean', defaultsTo: false},
		can_issued_with_charges:{type: 'boolean', defaultsTo: false},
		do_issued:				{type: 'boolean', defaultsTo: false},

		can_issue_date:			{type: 'number', defaultsTo: 0},
		do_issue_date:			{type: 'number', defaultsTo: 0}*/
	}
};
