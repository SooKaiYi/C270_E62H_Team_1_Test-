console.log('=== SERVER.JS IS RUNNING ===');

console.log('Loaded DB host:', process.env.DB_HOST);
const express = require('express');
const session = require('express-session');
const path = require('path');

const { metricsMiddleware, metricsHandler } = require('./metrics');

const app = express();

// =======================================
// Body Parser
// =======================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus checks this endpoint without being counted as user traffic.
app.get('/metrics', metricsHandler);

// Count normal CityScoot requests.
app.use(metricsMiddleware);

// =======================================
// Static Files
// =======================================

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../frontend/pages')));
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/styles', express.static(path.join(__dirname, '../frontend/styles')));

// =======================================
// Session
// =======================================

app.use(
  session({
    secret: 'bikeappsecret',
    resave: false,
    saveUninitialized: false,
  })
);

// =======================================
// View Engine
// =======================================

app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, '../frontend/views'),
  path.join(__dirname, '../frontend/pages'),
]);

// =======================================
// Routes
// =======================================

const routes = require('./routes/routes');
const mapRoutes = require('./routes/mapRoutes');
const rewardsRoutes = require('./routes/rewardsRoutes');
const walletRoutes = require('./routes/walletRoutes');
const profileRoutes = require('./routes/profileRoutes');
const bikeRoutes = require('./routes/bikeRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const trackerRoutes = require('./routes/trackerRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const bikeRepairFeatureRoutes = require('./routes/bikeRepairFeatureRoutes');
console.log('routes:', typeof routes);
console.log('mapRoutes:', typeof mapRoutes);
console.log('walletRoutes:', typeof walletRoutes);
console.log('bikeRoutes:', typeof bikeRoutes);
console.log('rentalRoutes:', typeof rentalRoutes);
app.use('/', routes);
app.use('/', mapRoutes);
app.use('/', rewardsRoutes);
app.use('/', profileRoutes);
app.use('/wallet', walletRoutes);
app.use('/bikes', bikeRoutes);
app.use('/rentals', rentalRoutes);
app.use('/', trackerRoutes);
app.use('/', leaderboardRoutes);
app.use('/repair', bikeRepairFeatureRoutes);

// =======================================
// 404 Page
// =======================================

app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// =======================================
// Start Server
// =======================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
