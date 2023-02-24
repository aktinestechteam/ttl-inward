/**
 * Transhipment.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		igm_city: 					{type: 'string'},
		awb_number:					{type: 'string', required: true},
		source: 					{type: 'string', required: true},
		destination:				{type: 'string', required: true},
		igm_no_rx:					{type: 'number'},
		flight_no_rx:				{type: 'string'},
		
		transfer_vehicle_number:	{type: 'string'},
		transfer_date: 				{type: 'number'},
		transfer_comments:			{type: 'string'},
		transfer_comments_by:		{type: 'string'},
		
		no_of_pieces_rx:			{type: 'number'},
		weight_rx:					{type: 'number'},
		commodity:					{type: 'string'},
	}
};
