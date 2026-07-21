const express = require("express");
const router = express.Router();

const rewardsController = require(
    "../controllers/rewardsController"
);

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    next();
}

router.get(
    "/rewards",
    requireLogin,
    async (req, res) => {
        try {
            const user = req.session.user;

            const record =
                await rewardsController
                    .getOrCreateUserRewards(user);

            const transactions =
                await rewardsController
                    .getUserTransactions(user.id);

            const nextReward = 50;

            const progress = Math.min(
                (record.points / nextReward) * 100,
                100
            );

            res.render("rewards", {
                user,
                rewards: record,
                transactions,
                progress,
                nextReward
            });
        } catch (error) {
            console.error(
                "Unable to load rewards:",
                error
            );

            res.status(500).send(
                "Unable to load rewards."
            );
        }
    }
);

router.post(
    "/api/rewards/calculate",
    requireLogin,
    (req, res) => {
        const minutes = Number(req.body.minutes);

        if (!Number.isFinite(minutes) || minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid duration."
            });
        }

        const result =
            rewardsController.calculatePoints(minutes);

        res.json({
            rideMinutes: minutes,
            pointsEarned: result.points,
            calculationResult: result
        });
    }
);

router.post(
    "/api/rewards/ride-complete",
    requireLogin,
    async (req, res) => {
        try {
            const minutes = Number(req.body.minutes);

            if (
                !Number.isFinite(minutes) ||
                minutes <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid duration."
                });
            }

            const result =
                await rewardsController.addRidePoints(
                    req.session.user,
                    minutes
                );

            res.json(result);
        } catch (error) {
            console.error(
                "Ride reward error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add ride points."
            });
        }
    }
);

router.post(
    "/api/rewards/referral/submit",
    requireLogin,
    async (req, res) => {
        try {
            const { referralCode } = req.body;

            if (!referralCode) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a referral code."
                });
            }

            const result =
                await rewardsController.processReferral(
                    req.session.user,
                    referralCode
                );

            res.json(result);
        } catch (error) {
            console.error(
                "Referral error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to process referral."
            });
        }
    }
);

router.post(
    "/api/rewards/redeem",
    requireLogin,
    async (req, res) => {
        try {
            const rewardPoints =
                Number(req.body.points);

            const result =
                await rewardsController.redeem(
                    req.session.user,
                    rewardPoints
                );

            res.json(result);
        } catch (error) {
            console.error(
                "Reward redemption error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to redeem reward."
            });
        }
    }
);

module.exports = router;