const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/', walletController.showDashboard);
router.get('/topup', walletController.showTopUp);
router.post('/topup', walletController.topUp);
router.get('/pass', walletController.showPasses);
router.post('/pass', walletController.purchasePass);
router.get('/history', walletController.showHistory);

module.exports = router;
