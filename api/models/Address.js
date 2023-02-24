/**
 * Address.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs  :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	attributes: {
		city_iata_code: {
			type: 'string',
			required: true
		},
		name: {
			type: 'string',
			required: true
		},
		name_alias: {
			type: 'string'
		},
		address: {
			type: 'string',
			required: true
		},
		address2: {
			type: 'string',
			defaultsTo: ''
		},
		email: {
			type: 'string' /*, required: true*/
		},
		pincode: {
			type: 'number',
			required: true
		},
		phone: {
			type: 'string' /*, required: true*/
		},
		state: {
			type: 'string' /*, required: true*/
		},
		gstin: {
			type: 'string'
		},
		hsn_code: {
			type: 'string'
		},
		tds_applicable: {
			type: 'boolean',
			defaultsTo: false
		},
		is_sez: {
			type: 'boolean',
			defaultsTo: false
		},
		is_enable_consignee: {
			type: 'boolean',
			defaultsTo: true
		},
		gst_exemption: {
			type: 'boolean',
			defaultsTo: false
		},
		gst_exemption_till_date: {
			type: 'number',
			defaultsTo: 0
		},
		credit_period: {
			type: 'string',
			defaultsTo: 'none'
		}, //  none / 7days / 15days / 30days
		type_of_customer: {
			type: 'string',
			defaultsTo: 'Direct'
		}, //  agency / direct / bank / direct_agency
		created_by: {
			type: 'string' /*, required: true*/
		},
		credit_debit_amount: {
			type: 'number'
		},
	},
	beforeCreate: function (address, callback) {
		toLowerCaseCustom(address);
		return callback();
	},
	beforeUpdate: function (address, callback) {
		toLowerCaseCustom(address);
		return callback();
	}
};

function toLowerCaseCustom(address) {
	if (address.name_alias)
		address.name_alias = address.name_alias.toLowerCase();
	return true;
}
