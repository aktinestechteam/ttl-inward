const bcrypt = require('bcrypt-nodejs');
module.exports = {
attributes: {
	id: {
	  type: 'string', columnName: '_id'
	},
		username: {
			type: 'string',
			unique: true///,
			/*required: true*/
		},
    email: {
      type: 'string',
      unique: true///,
			/*required: true*/
    },
		iata_code: {
			type: 'json',
			columnType: 'array'
		},
    password: {
      type: 'string'
    },
	role: {
		type: 'json',
		columnType: 'array'
	},
  },
  customToJSON: function() {
     return _.omit(this, ['password'])
  },
  beforeCreate: function(user, callback){
		bcrypt.genSalt(10, function(err, salt){
			bcrypt.hash(user.password, salt, null, function(err, hash){
				if(err) {
					return callback();
				} else {
					user.password = hash;
					return callback();
				}
			});
		});
  },beforeUpdate: function(user, callback) {
		if(user.password){
			bcrypt.genSalt(10, function(err, salt){
				bcrypt.hash(user.password, salt, null, function(err, hash){
					if(err) {
						return callback();
					} else {
						user.password = hash;
						return callback();
					}
				});
			});
		} else {
			return callback();
		}
	}
};

// function encryptpassword(user) {
// 	bcrypt.genSalt(10, function(err, salt){
// 		bcrypt.hash(user.password, salt, null, function(err, hash){
// 			if(err) {
// 				console.log(err);
// 				return false;
// 			} else {
// 				user.password = hash;
// 				console.log('-------------------------');
// 				console.log(user);
// 				console.log('-------------------------');
// 				return true;
// 			}
// 		});
// 	});
// }
