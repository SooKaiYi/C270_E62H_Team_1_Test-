const fs = require("fs");
const path = require("path");

const rewardsFile = path.join(__dirname, "../data/rewards.json");
const transactionsFile = path.join(__dirname, "../data/transactions.json");

// =======================================
// File helpers
// =======================================

function loadRewards() {
    if (!fs.existsSync(rewardsFile)) return {};
    return JSON.parse(fs.readFileSync(rewardsFile, "utf8"));
}

function saveRewards(data) {
    fs.writeFileSync(rewardsFile, JSON.stringify(data, null, 2));
}

function loadTransactions() {
    if (!fs.existsSync(transactionsFile)) return [];
    return JSON.parse(fs.readFileSync(transactionsFile, "utf8"));
}

function saveTransactions(data) {
    fs.writeFileSync(transactionsFile, JSON.stringify(data, null, 2));
}

// =======================================
// Referral code generation
// =======================================

function generateReferralCode(name, id) {
    const base = (name || "USER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "USER";
    return `${base}${id}${new Date().getFullYear()}`;
}

// =======================================
// Get (or lazily create) a user's rewards record
// =======================================

function getOrCreateUserRewards(user) {
    const rewards = loadRewards();
    const key = String(user.id);

    if (!rewards[key]) {
        rewards[key] = {
            points: 0,
            freeHours: 0,
            rides: 0,
            totalMinutes: 0,
            referralCode: generateReferralCode(user.name, user.id),
            friendsReferred: 0,
            referredBy: null
        };
        saveRewards(rewards);
    }

    return rewards[key];
}

// =======================================
// Points calculation
// =======================================

function calculatePoints(minutes) {
    const roundedMinutes = Math.floor(minutes);

    if (roundedMinutes < 10) {
        return {
            points: 0,
            roundedMinutes,
            originalMinutes: minutes,
            message: "Ride too short (need ≥10 min)"
        };
    }

    let points = Math.floor(roundedMinutes / 10);

    if (roundedMinutes >= 60) {
        points = Math.max(points, 15);
    }

    return {
        points,
        roundedMinutes,
        originalMinutes: minutes,
        message: `Earned ${points} points for ${roundedMinutes}min ride`
    };
}

function addRidePoints(user, minutes) {
    const rewards = loadRewards();
    const key = String(user.id);
    const record = rewards[key] || getOrCreateUserRewards(user);

    const result = calculatePoints(minutes);

    if (result.points === 0) {
        return { success: false, points: 0, message: result.message, transaction: null };
    }

    record.points += result.points;
    record.totalMinutes += result.roundedMinutes;
    record.rides += 1;
    rewards[key] = record;
    saveRewards(rewards);

    const hours = Math.floor(result.roundedMinutes / 60);
    const mins = result.roundedMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const transactions = loadTransactions();
    const transaction = {
        id: transactions.length + 1,
        userId: user.id,
        points: result.points,
        type: "earned",
        desc: `Ride ${timeStr} (${result.originalMinutes.toFixed(1)} min rounded down)`,
        date: new Date().toLocaleString()
    };
    transactions.unshift(transaction);
    saveTransactions(transactions);

    return {
        success: true,
        points: result.points,
        newBalance: record.points,
        roundedMinutes: result.roundedMinutes,
        originalMinutes: result.originalMinutes,
        message: `🎉 Earned ${result.points} points!`,
        transaction
    };
}

// =======================================
// Referral
// =======================================

function processReferral(user, referredByCode) {
    const rewards = loadRewards();
    const key = String(user.id);
    const record = rewards[key] || getOrCreateUserRewards(user);

    const referrerEntry = Object.entries(rewards).find(
        ([, r]) => r.referralCode.toUpperCase() === referredByCode.toUpperCase()
    );

    if (!referrerEntry) {
        return { success: false, message: "Invalid referral code." };
    }

    const [referrerId, referrerRecord] = referrerEntry;

    if (record.referredBy) {
        return { success: false, message: "You already used a referral code!" };
    }

    if (referrerId === key) {
        return { success: false, message: "You cannot use your own code!" };
    }

    const pointsEarned = referrerRecord.friendsReferred === 0 ? 20 : 5;

    referrerRecord.friendsReferred += 1;
    referrerRecord.points += pointsEarned;

    record.referredBy = referredByCode;
    record.points += 5;

    rewards[referrerId] = referrerRecord;
    rewards[key] = record;
    saveRewards(rewards);

    const transactions = loadTransactions();
    transactions.unshift({
        id: transactions.length + 1,
        userId: parseInt(referrerId),
        points: pointsEarned,
        type: "earned",
        desc: `🎉 Referral bonus: ${user.name} used your code! (+${pointsEarned} pts)`,
        date: new Date().toLocaleString()
    });
    transactions.unshift({
        id: transactions.length + 2,
        userId: user.id,
        points: 5,
        type: "earned",
        desc: `🎉 Welcome bonus: Used a referral code! (+5 pts)`,
        date: new Date().toLocaleString()
    });
    saveTransactions(transactions);

    return {
        success: true,
        message: `You used the code! You got 5 points, they got ${pointsEarned} points!`,
        pointsEarned,
        newPoints: record.points
    };
}

// =======================================
// Redeem
// =======================================

function redeem(user, rewardPoints) {
    const rewards = loadRewards();
    const key = String(user.id);
    const record = rewards[key] || getOrCreateUserRewards(user);

    if (record.points < rewardPoints) {
        return {
            success: false,
            message: `Not enough points. Need ${rewardPoints}, have ${record.points}`
        };
    }

    record.points -= rewardPoints;

    let hours = 0;
    if (rewardPoints === 25) hours = 0.5;
    else if (rewardPoints === 50) hours = 1;
    else if (rewardPoints === 100) hours = 2;

    if (hours > 0) record.freeHours += hours;

    rewards[key] = record;
    saveRewards(rewards);

    const transactions = loadTransactions();
    transactions.unshift({
        id: transactions.length + 1,
        userId: user.id,
        points: rewardPoints,
        type: "redeemed",
        desc: `Redeemed ${rewardPoints} pts for ${hours}h free`,
        date: new Date().toLocaleString()
    });
    saveTransactions(transactions);

    return {
        success: true,
        message: `🎉 Redeemed ${rewardPoints} points for ${hours}h free ride!`,
        newPoints: record.points,
        freeHours: record.freeHours
    };
}

// =======================================
// Transactions for a user
// =======================================

function getUserTransactions(userId) {
    return loadTransactions().filter(t => t.userId === userId);
}

module.exports = {
    getOrCreateUserRewards,
    calculatePoints,
    addRidePoints,
    processReferral,
    redeem,
    getUserTransactions
};
