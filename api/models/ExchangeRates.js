/**
 * ExchangeRates.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    currency:       {type: 'string', required: true},
    value_local:    {type: 'number', columnType: 'float', required: true},
    effective_from: {type: 'number', required: true},
    expires_on:     {type: 'number', defaultsTo: sails.config.globals.expires_at_infinity}
  },
};

