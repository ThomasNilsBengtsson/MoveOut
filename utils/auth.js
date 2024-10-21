function isAuthenticated(req, res, next) {
    if (req.session.email) {
        return next();
    } else {
        res.redirect('/login');
    }
}


function isAdmin(req, res, next)
{
    if(req.session && res.session.is_admin)
    {
        return next();
    } else{
        res.statis(403).send('Access denied. Admins only');
    }
}

module.exports = {isAuthenticated, isAdmin};