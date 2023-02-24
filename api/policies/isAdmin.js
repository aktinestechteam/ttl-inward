/**
 * allow any authenticated user
 */

module.exports = function (req, res, ok) {
	if(sails.config.custom.access_allowed(req.user.role, 'AppAdmin')) {
		return ok();
		//res.redirect('/');
	} else {
		return res.redirect('/loginldap');
		//return res.view('pages/page-login',{message: 'User Not Logged In'});
	}
};