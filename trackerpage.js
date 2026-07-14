const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'backend', 'controllers', 'routes', 'data'));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Placeholder session state until a real login system is connected
let userSession = {
    isLoggedIn: false,
    hasRented: true,
    name: 'Placeholder Rider',
    distance: 0
};

app.get('/', (req, res) => {
    res.render('login', { user: userSession });
});

app.post('/login', (req, res) => {
    const email = req.body.email || '';
    const password = req.body.password || '';

    if (email && password) {
        userSession.isLoggedIn = true;
        userSession.name = email.split('@')[0] || 'Placeholder Rider';
        userSession.hasRented = true;
        res.redirect('/tracker');
    } else {
        res.render('login', { user: userSession, error: 'Please enter an email and password.' });
    }
});

app.get('/tracker', (req, res) => {
    if (userSession.isLoggedIn && userSession.hasRented) {
        res.render('tracker', { user: userSession });
    } else {
        res.redirect('/');
    }
});

app.post('/tracker/distance', (req, res) => {
    if (!userSession.isLoggedIn || !userSession.hasRented) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const distance = Number(req.body.distance);
    if (!Number.isFinite(distance) || distance < 0) {
        return res.status(400).json({ error: 'Invalid distance' });
    }

    userSession.distance = (Number(userSession.distance) || 0) + distance;
    return res.json({ distance: userSession.distance });
});

app.get('/leaderboard', (req, res) => {
    if (userSession.isLoggedIn && userSession.hasRented) {
        const userDistance = Number(userSession.distance) || 0;
        const leaderboardData = {
            global: [
                { name: 'Ava', city: 'London', distance: 142.8 },
                { name: 'Noah', city: 'Paris', distance: 129.4 },
                { name: userSession.name, city: 'Your City', distance: userDistance },
                { name: 'Mia', city: 'Berlin', distance: 87.2 },
                { name: 'Liam', city: 'Rome', distance: 74.5 }
            ],
            friends: [
                { name: userSession.name, city: 'Your City', distance: userDistance },
                { name: 'Sam', city: 'Madrid', distance: 61.3 },
                { name: 'Ellie', city: 'Dublin', distance: 57.9 },
                { name: 'Owen', city: 'Oslo', distance: 43.1 }
            ]
        };

        res.render('leaderboard', { user: userSession, leaderboard: leaderboardData });
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    userSession.isLoggedIn = false;
    userSession.name = 'Placeholder Rider';
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));