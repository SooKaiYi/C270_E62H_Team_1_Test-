const leaderboardModel = require('../models/leaderboardModel');

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
    }
    next();
}

async function showLeaderboard(req, res, next) {
    try {
        const leaderboard = await leaderboardModel.getLeaderboard(
            req.session.user
        );

        res.render('leaderboard', {
            title: 'Ride Leaderboard',
            user: req.session.user,
            leaderboard
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    requireLogin,
    showLeaderboard
};
