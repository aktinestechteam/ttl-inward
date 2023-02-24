/**
 * Gst.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    state_name: {type: 'string', unique: true/*, required: true*/},
    gst_code:   {type: 'string', unique: true/*, required: true*/}
  }
};
