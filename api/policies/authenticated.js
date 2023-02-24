/**
 * allow any authenticated user
 */

module.exports = function (req, res, ok) {
	if(req.user) {
		return ok();
		//res.redirect('/');
	} else {
		//return res.redirect('/login');
		return res.redirect('/loginldap');
	}
};
