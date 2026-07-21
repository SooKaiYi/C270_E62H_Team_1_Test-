const trackerModel = require('../models/trackerModel');

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

async function showTracker(req, res, next) {
  try {
    const tracker = await trackerModel.getTrackerByUser(req.session.user.id);

    res.render('tracker', {
      title: 'Live Ride Tracker',
      user: req.session.user,
      tracker,
    });
  } catch (error) {
    next(error);
  }
}

async function saveDistance(req, res, next) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const distance = Number(req.body.distance);
    const bikeName = req.body.bikeName ? String(req.body.bikeName) : null;

    if (!Number.isFinite(distance) || distance < 0) {
      return res.status(400).json({ error: 'Invalid distance' });
    }

    const tracker = await trackerModel.saveRideDistance(
      req.session.user,
      distance,
      bikeName
    );

    res.json({ success: true, tracker, distance: tracker?.distance ?? null });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireLogin,
  showTracker,
  saveDistance,
};
