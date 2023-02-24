/**
 * Can.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		part_awb:					{type: 'string', required: true},
		awb_number:      			{type: 'string', required: true},
		awb_user_data:      		{type: 'string', required: true},
		can_issue_date:				{type: 'number', required: true},
		can_issued_with_charges:	{type: 'boolean', defaultsTo: false},
  	issued_by:	    			{type: 'string', required: true},
		void_on:					{type: 'number', defaultsTo: 0},
		void_by:					{type: 'string'},
		void_reason:				{type: 'string'},
		void_explanation:			{type: 'string'},
  	}
};
