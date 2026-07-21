const express = require('express');
const trackerController = require('../controllers/trackerController');

const router = express.Router();

router.get(
  '/tracker',
  trackerController.requireLogin,
  trackerController.showTracker
);
router.post(
  '/tracker/distance',
  trackerController.requireLogin,
  trackerController.saveDistance
);

module.exports = router;
