/**
 * Ports.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    iata_code:      {type: 'string', unique: true},
    city_name:      {type: 'string', required: true},
    is_inward_port: {type: 'boolean', defaultsTo: false}
  },
};

