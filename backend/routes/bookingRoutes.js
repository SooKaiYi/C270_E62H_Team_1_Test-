const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/', bookingController.showBookingForm);
router.post('/calculate', bookingController.calculatePrice);
router.get('/bookings', bookingController.viewBookings);

module.exports = router;
