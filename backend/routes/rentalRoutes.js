const express = require('express');
const router = express.Router();

const rentalController = require('../controllers/rentalController');

// =======================================
// Middleware
// =======================================

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login.html');
  }

  next();
}

function requireAdmin(req, res, next) {
  if (
    !req.session ||
    !req.session.user ||
    String(req.session.user.role).toLowerCase() !== 'admin'
  ) {
    return res.status(403).send('403 - Admin access required');
  }

  next();
}

// =======================================
// Member Routes
// =======================================

// View My Rentals
router.get('/', requireLogin, rentalController.showMyRentals);

// Rent a Bike
router.post('/rent/:id', requireLogin, rentalController.rentBike);

// Return a Bike
router.post('/return/:id', requireLogin, rentalController.returnBike);

// =======================================
// Admin Routes
// =======================================

// View All Rentals
router.get('/admin', requireAdmin, rentalController.showAdminRentals);

// Edit Rental
router.post('/edit/:id', requireAdmin, rentalController.updateRental);

// Delete Rental
router.post('/delete/:id', requireAdmin, rentalController.deleteRental);

module.exports = router;
