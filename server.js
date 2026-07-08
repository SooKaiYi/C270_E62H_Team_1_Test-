const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== SIMPLE IN-MEMORY DATABASE ==========
const user = {
    id: 1,
    name: 'Justin',
    email: 'justin@example.com',
    phone: '+65 9123 4567',
    location: 'Singapore',
    memberSince: 'January 2026',
    points: 142,
    freeHours: 1,
    rides: 12,
    totalMinutes: 260,
    referralCode: 'JUSTIN2026',
    friendsReferred: 0,
    referredBy: null
};

const transactions = [
    { id: 1, points: 3, type: 'earned', desc: 'Ride 25min', date: '2026-07-08 10:30' },
    { id: 2, points: 16, type: 'earned', desc: 'Ride 1h 10min', date: '2026-07-07 15:20' },
    { id: 3, points: 1, type: 'earned', desc: 'Ride 12min', date: '2026-07-06 09:10' },
    { id: 4, points: 50, type: 'redeemed', desc: 'Redeemed Free Hour', date: '2026-07-05 18:00' },
];

// All users for referral validation
const allUsers = [
    {
        id: 1,
        name: 'Justin',
        referralCode: 'JUSTIN2026',
        friendsReferred: 0,
        referredBy: null
    },
    {
        id: 2,
        name: 'WeiJin',
        referralCode: 'WEIJIN2026',
        friendsReferred: 0,
        referredBy: null
    },
    {
        id: 3,
        name: 'Bernice',
        referralCode: 'BERNICE2026',
        friendsReferred: 0,
        referredBy: null
    }
];

// ========== POINTS CALCULATION ==========

function calculatePoints(minutes) {
    const roundedMinutes = Math.floor(minutes);
    
    if (roundedMinutes < 10) {
        return { 
            points: 0, 
            roundedMinutes: roundedMinutes, 
            originalMinutes: minutes,
            message: 'Ride too short (need ≥10 min)'
        };
    }
    
    let points = Math.floor(roundedMinutes / 10);
    
    if (roundedMinutes >= 60) {
        points = Math.max(points, 15);
    }
    
    return { 
        points: points, 
        roundedMinutes: roundedMinutes, 
        originalMinutes: minutes,
        message: `Earned ${points} points for ${roundedMinutes}min ride`
    };
}

function addRidePoints(minutes) {
    const result = calculatePoints(minutes);
    
    if (result.points === 0) {
        return {
            success: false,
            points: 0,
            message: result.message,
            transaction: null
        };
    }
    
    user.points += result.points;
    user.totalMinutes += result.roundedMinutes;
    user.rides += 1;
    
    const hours = Math.floor(result.roundedMinutes / 60);
    const mins = result.roundedMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    const transaction = {
        id: transactions.length + 1,
        points: result.points,
        type: 'earned',
        desc: `Ride ${timeStr} (${result.originalMinutes.toFixed(1)} min rounded down)`,
        date: new Date().toLocaleString()
    };
    
    transactions.unshift(transaction);
    
    return {
        success: true,
        points: result.points,
        newBalance: user.points,
        roundedMinutes: result.roundedMinutes,
        originalMinutes: result.originalMinutes,
        message: `🎉 Earned ${result.points} points!`,
        transaction: transaction
    };
}

// ========== REFERRAL FUNCTIONS ==========

function processReferral(referredByCode) {
    const referrer = allUsers.find(u => u.referralCode.toUpperCase() === referredByCode.toUpperCase());
    
    if (!referrer) {
        return {
            success: false,
            message: 'Invalid referral code.'
        };
    }
    
    if (user.referredBy) {
        return {
            success: false,
            message: 'You already used a referral code!'
        };
    }
    
    if (referrer.id === user.id) {
        return {
            success: false,
            message: 'You cannot use your own code!'
        };
    }
    
    let pointsEarned = 5;
    if (referrer.friendsReferred === 0) {
        pointsEarned = 20;
    }
    
    referrer.friendsReferred += 1;
    user.points += pointsEarned;
    user.referredBy = referredByCode;
    
    transactions.unshift({
        id: transactions.length + 1,
        points: pointsEarned,
        type: 'earned',
        desc: `🎉 Referral bonus: ${referrer.name} used your code! (+${pointsEarned} pts)`,
        date: new Date().toLocaleString()
    });
    
    transactions.unshift({
        id: transactions.length + 1,
        points: 5,
        type: 'earned',
        desc: `🎉 Welcome bonus: Used ${referrer.name}'s referral code! (+5 pts)`,
        date: new Date().toLocaleString()
    });
    
    user.points += 5;
    
    return {
        success: true,
        message: `You used ${referrer.name}'s code! You got 5 points, they got ${pointsEarned} points!`,
        pointsEarned: pointsEarned,
        referrerName: referrer.name
    };
}

// ========== API ROUTES ==========

app.post('/api/ride-complete', (req, res) => {
    const { minutes } = req.body;
    
    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid duration.'
        });
    }
    
    const result = addRidePoints(minutes);
    res.json(result);
});

app.get('/api/user/points', (req, res) => {
    res.json({
        points: user.points,
        freeHours: user.freeHours,
        rides: user.rides,
        totalMinutes: user.totalMinutes
    });
});

app.post('/api/referral/submit', (req, res) => {
    const { referralCode } = req.body;
    
    if (!referralCode) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a referral code.'
        });
    }
    
    const result = processReferral(referralCode);
    res.json(result);
});

// ========== PAGE ROUTES ==========

app.get('/', (req, res) => {
    const nextReward = 50;
    const progress = Math.min((user.points / nextReward) * 100, 100);
    
    res.render('rewards', {
        user: user,
        transactions: transactions,
        progress: progress,
        nextReward: nextReward,
        pointsEarned: null,
        rideMinutes: null,
        calculationResult: null
    });
});

app.post('/calculate', (req, res) => {
    const minutes = parseFloat(req.body.minutes);
    const result = calculatePoints(minutes);
    
    const nextReward = 50;
    const progress = Math.min((user.points / nextReward) * 100, 100);
    
    res.render('rewards', {
        user: user,
        transactions: transactions,
        progress: progress,
        nextReward: nextReward,
        pointsEarned: result.points,
        rideMinutes: minutes,
        calculationResult: result
    });
});

app.post('/api/redeem', (req, res) => {
    const { points } = req.body;
    const rewardPoints = parseInt(points);
    
    if (user.points < rewardPoints) {
        return res.json({ 
            success: false, 
            message: `Not enough points. Need ${rewardPoints}, have ${user.points}` 
        });
    }
    
    user.points -= rewardPoints;
    
    let hours = 0;
    if (rewardPoints === 25) hours = 0.5;
    else if (rewardPoints === 50) hours = 1;
    else if (rewardPoints === 100) hours = 2;
    
    if (hours > 0) {
        user.freeHours += hours;
    }
    
    transactions.unshift({
        id: transactions.length + 1,
        points: rewardPoints,
        type: 'redeemed',
        desc: `Redeemed ${rewardPoints} pts for ${hours}h free`,
        date: new Date().toLocaleString()
    });
    
    res.json({ 
        success: true, 
        message: `🎉 Redeemed ${rewardPoints} points for ${hours}h free ride!`,
        newPoints: user.points,
        freeHours: user.freeHours
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`👥 Your Referral Code: ${user.referralCode}`);
    console.log(`📝 Points: 1 per 10 min | Rounded down | Min 15 for 1h+`);
    console.log(`🎁 Referral: 1st friend 20pts, each after 5pts`);
});