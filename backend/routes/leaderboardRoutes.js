const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/leaderboard', leaderboardController.requireLogin, leaderboardController.showLeaderboard);

module.exports = router;
