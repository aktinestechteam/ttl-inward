/**
 * ScannedFFM.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

	attributes: {
		igm:				{model: 'Igm'},
		uploaded_by: 		{type: 'string'},
		uploaded_on: 		{type: 'number'},
		filepath: 			{type: 'string'},
		igm_city: 			{type: 'string'},
		approved_by: 		{type: 'string'},
		approved_on: 		{type: 'number'},
		reason:				{type: 'string'},
		status:				{type: 'string', required: true, isIn: ['upload_pending', 'approval_pending', 'ok', 'rejected', 'revoked']}
	}
};
