const assert = require('assert');
const fs = require('fs');
const path = require('path');
const walletService = require('../backend/services/walletService');

assert.ok(fs.existsSync(path.join(__dirname, '..', 'backend', 'server.js')), 'server.js should exist');
assert.ok(fs.existsSync(path.join(__dirname, '..', 'backend', 'routes', 'walletRoutes.js')), 'walletRoutes.js should exist');
assert.strictEqual(walletService.PASS_PRICES.single_trip.price, 2.00, 'Single trip should cost $2.00');
assert.strictEqual(walletService.PASS_PRICES.day_pass.price, 10.00, 'Day pass should cost $10.00');

console.log('Basic wallet feature checks passed.');
