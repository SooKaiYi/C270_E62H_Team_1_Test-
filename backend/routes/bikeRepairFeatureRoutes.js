const express = require('express');

const router = express.Router();

const controller = require('../controllers/bikeRepairFeatureController');

// Show repair form
router.get('/', controller.showRepairPage);

// Submit repair form
router.post('/submit', controller.submitRepairReport);

// Show admin repair page
router.get('/admin', controller.showAdminPage);

// Update repair status
router.post('/admin/update/:id', controller.updateRepairStatus);

module.exports = router;
