const express = require('express');
const path = require('path');

const mapRoutes = require('./routes/mapRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
// Add an unused variable (ESLint will catch this)
const badTestVariable = 'this is unused';
// Read form and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'pages'));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/', mapRoutes);
app.use('/wallet', walletRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
