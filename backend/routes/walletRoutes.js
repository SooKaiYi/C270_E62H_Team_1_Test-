const express = require('express');
const router = express.Router();
const { requireLogin } = require('../utils/auth');
const walletService = require('../services/walletService');

router.use(requireLogin);

router.get('/', async (req, res, next) => {
    try {
        const dashboard = await walletService.getWalletDashboard(req.session.user.id);

        res.render('wallet/index', {
            title: 'Wallet Dashboard',
            wallet: dashboard.wallet,
            transactions: dashboard.transactions
        });
    } catch (error) {
        next(error);
    }
});

router.get('/topup', async (req, res) => {
    res.render('wallet/topup', {
        title: 'Top Up Wallet'
    });
});

router.post('/topup', async (req, res) => {
    try {
        await walletService.topUpWallet(req.session.user.id, req.body.amount);
        req.session.successMessage = 'Credits added successfully.';
        res.redirect('/wallet');
    } catch (error) {
        req.session.errorMessage = error.message;
        res.redirect('/wallet/topup');
    }
});

router.get('/pass', async (req, res) => {
    res.render('wallet/pass', {
        title: 'Buy Pass',
        passes: walletService.PASS_PRICES
    });
});

router.post('/pass', async (req, res) => {
    try {
        const result = await walletService.purchasePass(req.session.user.id, req.body.passType);
        req.session.successMessage = `${result.pass.label} purchased successfully.`;
        res.redirect('/wallet');
    } catch (error) {
        req.session.errorMessage = error.message;
        res.redirect('/wallet/pass');
    }
});

router.get('/history', async (req, res, next) => {
    try {
        const transactions = await walletService.getTransactionHistory(req.session.user.id);

        res.render('wallet/history', {
            title: 'Transaction History',
            transactions
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
