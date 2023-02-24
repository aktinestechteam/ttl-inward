/**
 * Hawb.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    hawb_no:            {type: 'string', required: true},
    mawb_number:        {type: 'string', required: true},
    no_of_pieces:       {type: 'number', required: true},
    total_no_of_pieces: {type: 'number', required: true},
    weight:             {type: 'number', required: true},
    total_weight:       {type: 'number', required: true},
    origin:             {type: 'string'},
    destination:        {type: 'string'},
    created_by:         {type: 'string', required: true},
		deletedhawb_on:                  	{type: 'number', defaultsTo: 0},
		deletehawb_reason:            		{type: 'string'},
		deletehawb_explanation:            {type: 'string'}
  }
};
