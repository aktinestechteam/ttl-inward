/**
* Email.js
*
* @description :: A model definition.  Represents a database table/collection/etc.
* @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
*/

module.exports = {

	attributes: {
		//msg_id:				{type: 'string', required: true , unique: true },	//both constrains are important to avoid null entry
		subject:			{type: 'string', required: true , unique: true },
		from:				{type: 'string', required: true },
		reason:				{type: 'string' },
	}
};