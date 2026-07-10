const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

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
        return res
            .status(403)
            .send('403 - Admin access required');
    }

    next();
}

router.use(requireLogin);

router.get('/', walletController.showDashboard);

router.get(
    '/admin',
    requireAdmin,
    walletController.showAdminDashboard
);

router.get('/', walletController.showDashboard);
router.get('/topup', walletController.showTopUp);
router.post('/topup', walletController.topUp);
router.get('/pass', walletController.showPasses);
router.post('/pass', walletController.purchasePass);
router.get('/history', walletController.showHistory);

module.exports = router;
