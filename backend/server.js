const path = require('path');
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const userService = require('./services/userService');
const { currentUser } = require('./utils/auth');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'templates'));
app.locals.formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;
app.locals.formatDateTime = (value) => new Date(value).toLocaleString('en-SG');
app.locals.transactionSign = (type) => type === 'Top Up' ? '+' : '-';

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'static')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'local-bike-rental-secret',
    resave: false,
    saveUninitialized: false
}));
app.use(currentUser);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'bike-rental-wallet'
    });
});

app.get('/', (req, res) => {
    res.redirect('/wallet');
});

// Simple local login page for testing this feature. Replace with the app's
// existing login route if you merge this into a larger project.
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login'
    });
});

app.post('/login', async (req, res, next) => {
    try {
        const user = await userService.findUserByEmail(req.body.email);

        if (!user) {
            req.session.errorMessage = 'User not found. Use alice@example.com from users.json.';
            return res.redirect('/login');
        }

        req.session.user = user;
        const returnTo = req.session.returnTo || '/wallet';
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        next(error);
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.use('/wallet', walletRoutes);

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you requested could not be found.'
    });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'Something went wrong. Please try again.'
    });
});

app.listen(PORT, () => {
    console.log(`Bike Rental app running at http://localhost:${PORT}`);
});
