function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }

    next();
}

function currentUser(req, res, next) {
    res.locals.currentUser = req.session ? req.session.user : null;
    res.locals.successMessage = req.session ? req.session.successMessage : null;
    res.locals.errorMessage = req.session ? req.session.errorMessage : null;

    if (req.session) {
        delete req.session.successMessage;
        delete req.session.errorMessage;
    }

    next();
}

module.exports = {
    requireLogin,
    currentUser
};
