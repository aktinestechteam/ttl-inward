const passport = require('passport');
const voca = require('voca');

module.exports = {

getlogin: function(req, res) {
	if(req.user) {
		if(sails.config.custom.access_allowed(req.user.role, 'User')) {
			sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
			res.redirect('/igm');
		} else if (sails.config.custom.access_allowed(req.user.role, 'AppAdmin')){
			sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
			res.redirect('/airportlist');
		} else {
			sails.log.error(' - ' + new Date() +' ERR - (getlogin - get)' + 'userrole may be the reason behind failure');
			res.view('pages/authentication-login');
		}
	} else {
		res.view('pages/authentication-login');
	}
},
getloginldap: function(req, res) {
	if(req.user) {
		if(sails.config.custom.access_allowed(req.user.role, 'User')) {
			sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '1');
			res.redirect('/igm');
		} else if (sails.config.custom.access_allowed(req.user.role, 'AppAdmin')){
			sails.config.globals.putinfolog(req.user.username, req.options.action, 'get', '2');
			res.redirect('/airportlist');
		} else {
			sails.log.error(' - ' + new Date() +' ERR - (getloginldap - get)' + 'userrole may be the reason behind failure');
			res.view('pages/authentication-login-ldap');
		}
	} else {
		//sails.log.error(' - ' + new Date() +' ERR - (getloginldap - get)' + 'May be user not found');
		res.view('pages/authentication-login-ldap');
	}
},

login: function(req, res) {
    passport.authenticate('local', function(err, user, info){
      if((err) || (!user)) {
					sails.log.error(' - ' + new Date() +' ERR - (login - post)' + err);
		  		return res.redirect('/login');
				//return res.view('pages/authentication-login',{message: info.message});
				//res.view('/page-login', {message: info.message, layout: null});
				//return res.send({message: info.message,user});
			} else {
				req.logIn(user, function(err) {
					if(err) {
						sails.log.error(' - ' + new Date() +' ERR - (login - post)' + err);
						res.send(err);
					} else {
						sails.log.info(user.username + ' - ' + new Date() + ' - User logged in');
						return res.redirect('/');
					}
				});
			}
    })(req, res);
},

loginldap: function(req, res) {
    passport.authenticate('ldapauth', function(err, user, info){
		if(err) {
			sails.log.error(' - ' + new Date() +' ERR - (loginldap - post)' + err);
			return res.view('pages/authentication-login-ldap', {info: info});
		}

		if(user) {

			/////////////////////////////////	HACK
	/*		user.employeeType = 'User';
			let roles = user.employeeType.split(',');console.log(roles);
			if(roles.indexOf('AppAdmin') != -1)
			//if(user.employeeType === 'AppAdmin')
				user.employeeType = 'AppAdmin';
*/
			//if(roles.indexOf('User') != -1)
			if(user.employeeType === 'user')
				user.employeeType = 'User';
		
			/////////////////////////////////	HACK

			if(user.division) { // && (user.employeeType === 'AppAdmin' || user.employeeType === 'User')) {
				user.username = user.sAMAccountName;
				user.role = user.employeeType;
				user.iata_code = user.division.split(',');
				req.logIn(user, function(err) {
					if (err) {
						sails.log.error(' - ' + new Date() +' ERR - (loginldap - post)' + err);
						return next(err);
					}
					sails.log.info(user.username + ' - ' + new Date() + ' - User logged in');
					return res.redirect('/igm');
				});
			} else {
				sails.log.error(' - ' + new Date() +' ERR - (loginldap - post)' + 'You are not authorized for access');
				return res.view('pages/authentication-login-ldap', {info: 'You are not authorized for access'});
			}
		} else {
			info = voca.replaceAll(info, sails.config.globals.ldap_access_url, '***.***.***.***');
			info = voca.replaceAll(info, sails.config.globals.ldap_access_port, '****');
			sails.log.error(' - ' + new Date() +' ERR - (loginldap - post)' + info);
			return res.view('pages/authentication-login-ldap', {info: info});
		}
	})(req, res);
},

logout: function(req, res) {
    req.logout();
    res.redirect('/loginldap');
  }
};
