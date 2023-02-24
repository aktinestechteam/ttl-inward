/**
 * Awb.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
        awb_number:             	{type: 'string', unique: true/*, required: true*/},
        origin:                 	{type: 'string', required: true},
        destination:            	{type: 'string', required: true},
		awb_city:					{type: 'string'},
		void_reason:            		{type: 'string'},
		void_explanation:            {type: 'string'},
	}
};
