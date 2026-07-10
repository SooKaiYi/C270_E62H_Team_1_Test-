const express = require("express");
const router = express.Router();

const rewardsController = require("../controllers/rewardsController");

// =======================================
// Auth Middleware (same pattern as routes.js)
// =======================================

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login.html");
    }
    next();
}

// =======================================
// Rewards Page
// =======================================

router.get("/rewards", requireLogin, (req, res) => {
    const user = req.session.user;
    const record = rewardsController.getOrCreateUserRewards(user);
    const transactions = rewardsController.getUserTransactions(user.id);

    const nextReward = 50;
    const progress = Math.min((record.points / nextReward) * 100, 100);

    res.render("rewards", {
        user,
        rewards: record,
        transactions,
        progress,
        nextReward
    });
});

// =======================================
// Ride Simulator (calculate only, no balance change)
// =======================================

router.post("/api/rewards/calculate", requireLogin, (req, res) => {
    const minutes = parseFloat(req.body.minutes);

    if (isNaN(minutes) || minutes <= 0) {
        return res.status(400).json({ success: false, error: "Invalid duration." });
    }

    const result = rewardsController.calculatePoints(minutes);
    res.json({ rideMinutes: minutes, pointsEarned: result.points, calculationResult: result });
});

// =======================================
// Ride Complete (adds points to balance - for tracking integration)
// =======================================

router.post("/api/rewards/ride-complete", requireLogin, (req, res) => {
    const { minutes } = req.body;

    if (!minutes || typeof minutes !== "number" || minutes <= 0) {
        return res.status(400).json({ success: false, error: "Invalid duration." });
    }

    const result = rewardsController.addRidePoints(req.session.user, minutes);
    res.json(result);
});

// =======================================
// Referral Submit
// =======================================

router.post("/api/rewards/referral/submit", requireLogin, (req, res) => {
    const { referralCode } = req.body;

    if (!referralCode) {
        return res.status(400).json({ success: false, message: "Please enter a referral code." });
    }

    const result = rewardsController.processReferral(req.session.user, referralCode);
    res.json(result);
});

// =======================================
// Redeem
// =======================================

router.post("/api/rewards/redeem", requireLogin, (req, res) => {
    const rewardPoints = parseInt(req.body.points);
    const result = rewardsController.redeem(req.session.user, rewardPoints);
    res.json(result);
});

module.exports = router;
