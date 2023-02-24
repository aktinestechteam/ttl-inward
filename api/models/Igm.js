/**
 * Igm.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
	//igm number is igm date currently but it is not full date with time
    igm_number:			{type: 'string', unique: true, required: true},
	//igm number is igm date currently but it is not full date with time
    igm_date: 			{type: 'number'},
	flight_number:	{type: 'string'},
    flight_date: 		{type: 'number'},
    inward_date: 		{type: 'number'},
    uploaded_by: 		{type: 'string'},
	change_history: {type: 'json', columnType: 'array', defaultsTo: []},
	//change_explanation:            {type: 'string'},
	igm_city: 			{type: 'string'}
  }
};
