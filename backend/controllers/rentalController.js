const rentalModel = require('../models/rentalModel');

// =======================================
// Member - View My Rentals
// =======================================

async function showMyRentals(req, res, next) {
  try {
    const rentals = await rentalModel.getUserRentals(req.session.user.id);

    res.render('rentals/index', {
      title: 'My Rentals',
      user: req.session.user,
      rentals,
    });
  } catch (error) {
    next(error);
  }
}

// =======================================
// Admin - View All Rentals
// =======================================

async function showAdminRentals(req, res, next) {
  try {
    const rentals = await rentalModel.getAllRentals();

    res.render('rentals/admin', {
      title: 'Rental Management',
      user: req.session.user,
      rentals,
    });
  } catch (error) {
    next(error);
  }
}

// =======================================
// Rent Bike
// =======================================

async function rentBike(req, res, next) {
  try {
    await rentalModel.rentBike({
      userId: req.session.user.id,

      userName: req.session.user.name,

      bikeId: req.params.id,
    });

    res.redirect('/rentals');
  } catch (error) {
    if (error.name === 'InsufficientBalanceError') {
      return res.render('wallet/insufficient-balance', {
        title: 'Insufficient Balance',
        user: req.session.user,
        balance: error.balance,
        required: error.required,
      });
    }

    next(error);
  }
}

// =======================================
// Return Bike
// =======================================

async function returnBike(req, res, next) {
  try {
    await rentalModel.returnBike(req.params.id);

    res.redirect('/rentals');
  } catch (error) {
    next(error);
  }
}

// =======================================
// Edit Rental
// =======================================

async function updateRental(req, res, next) {
  try {
    await rentalModel.updateRental(req.params.id, req.body);

    res.redirect('/rentals/admin');
  } catch (error) {
    next(error);
  }
}

// =======================================
// Delete Rental
// =======================================

async function deleteRental(req, res, next) {
  try {
    await rentalModel.deleteRental(req.params.id);

    res.redirect('/rentals/admin');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  showMyRentals,

  showAdminRentals,

  rentBike,

  returnBike,

  updateRental,

  deleteRental,
};
