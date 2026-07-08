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
    name: 'KaiYi',
    points: 142,
    freeHours: 1,
    rides: 12,
    totalMinutes: 260
};

const transactions = [
    { id: 1, points: 3, type: 'earned', desc: 'Ride 25min', date: '2026-07-08 10:30' },
    { id: 2, points: 16, type: 'earned', desc: 'Ride 1h 10min', date: '2026-07-07 15:20' },
    { id: 3, points: 1, type: 'earned', desc: 'Ride 12min', date: '2026-07-06 09:10' },
    { id: 4, points: 50, type: 'redeemed', desc: 'Redeemed Free Hour', date: '2026-07-05 18:00' },
];

// ========== CORE REWARDS FUNCTIONS ==========

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

// ========== TRACKING INTEGRATION ==========

app.post('/api/ride-complete', (req, res) => {
    const { minutes } = req.body;
    
    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid duration. Please provide minutes as a number.'
        });
    }
    
    const result = addRidePoints(minutes);
    
    res.json({
        success: result.success,
        pointsEarned: result.points,
        newBalance: result.newBalance || user.points,
        roundedMinutes: result.roundedMinutes,
        originalMinutes: result.originalMinutes,
        message: result.message,
        transaction: result.transaction
    });
});

app.get('/api/user/points', (req, res) => {
    res.json({
        points: user.points,
        freeHours: user.freeHours,
        rides: user.rides,
        totalMinutes: user.totalMinutes
    });
});

// ========== REWARDS PAGE AT ROOT (/) ==========

// Home page - NOW SHOWS REWARDS DASHBOARD
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

// Manual calculation for testing
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

// Redeem Reward
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
    console.log(`🔄 Tracking Integration: POST /api/ride-complete`);
    console.log(`📝 Points: 1 per 10 min | Rounded down | Min 15 for 1h+`);
});