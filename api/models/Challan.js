/**
 * Challan.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		challan_no:					{type: 'string'},
		unique_challan:				{type: 'string', unique: true},	//19_20_BOM_HDFC_<challan_no>
		city_iata_code:				{type: 'string'},
		bank_ifsc:					{type: 'string'},
		challan_for:				{type: 'string'},	//	cash/chq-dd
		//awbs:						{type: 'json', columnType: 'array', required: true},
		invoices:					{type: 'json', columnType: 'array', required: true},
		created_by:					{type: 'string'},
		void_on:					{type: 'number', defaultsTo: 0},
		void_reason:				{type: 'string'},
		void_by:					{type: 'string'},
	}
};
