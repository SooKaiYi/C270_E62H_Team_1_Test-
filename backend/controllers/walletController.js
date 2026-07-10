const walletModel = require('../models/walletModel');

function getCurrentUserId(req) {
    if (req.session && req.session.user && req.session.user.id) {
        return req.session.user.id;
    }

    // Temporary fallback for testing only
    return 1;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency: 'SGD'
    }).format(Number(amount) || 0);
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('en-SG');
}

function transactionSign(type) {
    const creditTypes = [
        'Top Up',
        'Top-Up',
        'Refund',
        'Credit'
    ];

    return creditTypes.includes(type) ? '+' : '-';
}

async function showDashboard(req, res, next) {
    try {
        const userId = getCurrentUserId(req);
        const dashboard = await walletModel.getWalletDashboard(userId);

        res.render('wallet/index', {
            title: 'Wallet Dashboard',
            user: req.session ? req.session.user : null,
            wallet: dashboard.wallet,
            transactions: dashboard.transactions,
            formatCurrency,
            formatDateTime,
            transactionSign
        });
    } catch (error) {
        next(error);
    }
}

function showTopUp(req, res) {
    res.render('wallet/topup', {
        title: 'Top Up Wallet',
        user: req.session ? req.session.user : null
    });
}

async function topUp(req, res) {
    try {
        const userId = getCurrentUserId(req);

        await walletModel.topUpWallet(
            userId,
            req.body.amount
        );

        if (req.session) {
            req.session.successMessage = 'Credits added successfully.';
        }

        res.redirect('/wallet');
    } catch (error) {
        if (req.session) {
            req.session.errorMessage = error.message;
        }

        res.redirect('/wallet/topup');
    }
}

function showPasses(req, res) {
    res.render('wallet/pass', {
        title: 'Buy Pass',
        user: req.session ? req.session.user : null,
        passes: walletModel.PASS_PRICES,
        formatCurrency
    });
}

async function purchasePass(req, res) {
    try {
        const userId = getCurrentUserId(req);

        const result = await walletModel.purchasePass(
            userId,
            req.body.passType
        );

        if (req.session) {
            req.session.successMessage =
                `${result.pass.label} purchased successfully.`;
        }

        res.redirect('/wallet');
    } catch (error) {
        if (req.session) {
            req.session.errorMessage = error.message;
        }

        res.redirect('/wallet/pass');
    }
}

async function showHistory(req, res, next) {
    try {
        const userId = getCurrentUserId(req);

        const transactions =
            await walletModel.getTransactionHistory(userId);

        res.render('wallet/history', {
            title: 'Transaction History',
            user: req.session ? req.session.user : null,
            transactions,
            formatCurrency,
            formatDateTime,
            transactionSign
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    showDashboard,
    showTopUp,
    topUp,
    showPasses,
    purchasePass,
    showHistory
};