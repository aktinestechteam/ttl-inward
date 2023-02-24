/**
 * PartAwbPending.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		part_awb:			{model: 'PartAwb'},
		created_by:			{type: 'string'},
		reason_type:		{type: 'string'},
		reason:				{type: 'string'},
		status:				{type: 'string', isIn: ['pending', 'approved', 'rejected'], defaultsTo: 'pending'},
		actioned_on:		{type: 'number'}
	}
};
