/**
 * Reasons.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		reason_type:      {type: 'string', required: true/*, unique: true*/},
		reason:           {type: 'string', required: true},
		make_it_visible:  {type: 'boolean', defaultsTo: true},
	}
};
