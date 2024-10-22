function isAuthenticated(req, res, next) {
    if (req.session.email) {
        return next();
    } else {
        res.redirect('/login');
    }
}


function isAdmin(req, res, next)
{
    if(req.session && req.session.is_admin)
    {
        return next();
    } else{
        res.status(403).send('Access denied, only admins can access');
    }
}

module.exports = {isAuthenticated, isAdmin};