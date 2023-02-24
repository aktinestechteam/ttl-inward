module.exports = function(req, res, next) {
    req.session._garbage = Date();
    req.session.touch();
    return next();
}