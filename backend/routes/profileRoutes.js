const express = require('express');
const router = express.Router();

const rewardsController = require('../controllers/rewardsController');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

router.get('/profile', requireLogin, (req, res) => {
  const user = req.session.user;
  const record = rewardsController.getOrCreateUserRewards(user);

  res.render('profile', { user, rewards: record });
});

module.exports = router;
