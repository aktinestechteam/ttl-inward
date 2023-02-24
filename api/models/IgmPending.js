/**
 * IgmPending.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		igm_number:			{type: 'string'},
		igm_date: 			{type: 'number'},
		flight_number:		{type: 'string'},
		flight_date: 		{type: 'number'},
		inward_date: 		{type: 'number'},
		uploaded_by: 		{type: 'string'},
		filepath: 			{type: 'string'},
		igm_city: 			{type: 'string'},
		status:				{type: 'string', defaultsTo: 'pending', isIn: ['pending', 'available', 'declined', 'used', 'corrupt file']}
	}
};
