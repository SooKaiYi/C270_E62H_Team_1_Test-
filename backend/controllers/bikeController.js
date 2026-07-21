const bikeModel = require('../models/bikeModel');

// =======================================
// Member - View All Bikes
// =======================================

async function showBikes(req, res, next) {
  try {
    const bikes = await bikeModel.getAllBikes();

    res.render('bikes/index', {
      title: 'Bikes',
      user: req.session ? req.session.user : null,
      bikes,
    });
  } catch (error) {
    next(error);
  }
}

// =======================================
// Admin - View Bike Management
// =======================================

async function showAdminBikes(req, res, next) {
  try {
    const bikes = await bikeModel.getAllBikes();

    res.render('bikes/admin', {
      title: 'Manage Bikes',
      user: req.session.user,
      bikes,
    });
  } catch (error) {
    next(error);
  }
}

// =======================================
// Show Add Bike Page
// =======================================

function showAddBike(req, res) {
  res.render('bikes/add', {
    title: 'Add Bike',
    user: req.session.user,
  });
}

// =======================================
// Add Bike
// =======================================

async function addBike(req, res, next) {
  try {
    await bikeModel.addBike(req.body);

    res.redirect('/bikes/admin');
  } catch (error) {
    next(error);
  }
}

// =======================================
// Show Edit Bike Page
// =======================================

async function showEditBike(req, res, next) {
  try {
    const bike = await bikeModel.getBikeById(req.params.id);

    if (!bike) {
      return res.status(404).send('Bike not found');
    }

    res.render('bikes/edit', {
      title: 'Edit Bike',
      user: req.session.user,
      bike,
    });
  } catch (error) {
    next(error);
  }
}

// =======================================
// Update Bike
// =======================================

async function updateBike(req, res, next) {
  try {
    await bikeModel.updateBike(req.params.id, req.body);

    res.redirect('/bikes/admin');
  } catch (error) {
    next(error);
  }
}

// =======================================
// Delete Bike
// =======================================

async function deleteBike(req, res, next) {
  try {
    await bikeModel.deleteBike(req.params.id);

    res.redirect('/bikes/admin');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  showBikes,
  showAdminBikes,
  showAddBike,
  addBike,
  showEditBike,
  updateBike,
  deleteBike,
};
