/**
 * Memo.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    type:{
      type: 'string',
    },// (debit/credit)
    MAWB: {
      type: 'string',
    },
    value: {
      type: 'number',
    },
    created_on: {
      type: 'number',
    },
    last_modified_on: {
      type: 'number',
    },
    created_by: {
      type: 'string',
    },
  },
};

