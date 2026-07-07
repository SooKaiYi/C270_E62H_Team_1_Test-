const { readJson, writeJson } = require('./jsonFileService');

const PASS_PRICES = {
    single_trip: {
        label: 'Single Trip',
        price: 2.00,
        transactionType: 'Single Trip'
    },
    day_pass: {
        label: 'Day Pass',
        price: 10.00,
        transactionType: 'Day Pass'
    }
};

class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}

let walletWriteQueue = Promise.resolve();

function runWalletWrite(task) {
    // Queue writes so two quick requests do not overwrite each other's JSON updates.
    walletWriteQueue = walletWriteQueue.then(task, task);
    return walletWriteQueue;
}

function normalizeUserId(userId) {
    return Number(userId);
}

async function getOrCreateWallet(userId) {
    const numericUserId = normalizeUserId(userId);
    const wallets = await readJson('wallets.json');
    let wallet = wallets.find((item) => item.userId === numericUserId);

    if (!wallet) {
        wallet = {
            userId: numericUserId,
            balance: 0
        };
        wallets.push(wallet);
        await writeJson('wallets.json', wallets);
    }

    return wallet;
}

async function getWalletDashboard(userId) {
    const wallet = await getOrCreateWallet(userId);
    const transactions = await getTransactionHistory(userId);

    return {
        wallet,
        transactions: transactions.slice(0, 5)
    };
}

async function topUpWallet(userId, amount) {
    const topUpAmount = Number(amount);

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
        throw new Error('Top-up amount must be more than 0.');
    }

    return runWalletWrite(async () => {
        const numericUserId = normalizeUserId(userId);
        const wallets = await readJson('wallets.json');
        const transactions = await readJson('wallet_transactions.json');
        let wallet = wallets.find((item) => item.userId === numericUserId);

        if (!wallet) {
            wallet = {
                userId: numericUserId,
                balance: 0
            };
            wallets.push(wallet);
        }

        const balanceAfter = Number(wallet.balance) + topUpAmount;
        wallet.balance = Number(balanceAfter.toFixed(2));

        transactions.push(createTransaction(transactions, {
            userId: numericUserId,
            type: 'Top Up',
            amount: topUpAmount,
            balanceAfter: wallet.balance,
            status: 'Success'
        }));

        await writeJson('wallets.json', wallets);
        await writeJson('wallet_transactions.json', transactions);

        return wallet.balance;
    });
}

async function purchasePass(userId, passType) {
    const selectedPass = PASS_PRICES[passType];

    if (!selectedPass) {
        throw new Error('Please choose a valid pass.');
    }

    return runWalletWrite(async () => {
        const numericUserId = normalizeUserId(userId);
        const wallets = await readJson('wallets.json');
        const transactions = await readJson('wallet_transactions.json');
        let wallet = wallets.find((item) => item.userId === numericUserId);

        if (!wallet) {
            wallet = {
                userId: numericUserId,
                balance: 0
            };
            wallets.push(wallet);
        }

        const currentBalance = Number(wallet.balance);

        if (currentBalance < selectedPass.price) {
            transactions.push(createTransaction(transactions, {
                userId: numericUserId,
                type: selectedPass.transactionType,
                amount: selectedPass.price,
                balanceAfter: currentBalance,
                status: 'Failed'
            }));

            await writeJson('wallet_transactions.json', transactions);
            throw new InsufficientBalanceError('Insufficient wallet balance. Please top up credits first.');
        }

        const balanceAfter = currentBalance - selectedPass.price;
        wallet.balance = Number(balanceAfter.toFixed(2));

        transactions.push(createTransaction(transactions, {
            userId: numericUserId,
            type: selectedPass.transactionType,
            amount: selectedPass.price,
            balanceAfter: wallet.balance,
            status: 'Success'
        }));

        await writeJson('wallets.json', wallets);
        await writeJson('wallet_transactions.json', transactions);

        return {
            pass: selectedPass,
            balanceAfter: wallet.balance
        };
    });
}

async function getTransactionHistory(userId) {
    const numericUserId = normalizeUserId(userId);
    const transactions = await readJson('wallet_transactions.json');

    return transactions
        .filter((transaction) => transaction.userId === numericUserId)
        .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp));
}

function createTransaction(existingTransactions, transactionData) {
    const nextTransactionId = existingTransactions.reduce((highestId, transaction) => {
        return Math.max(highestId, Number(transaction.transactionId || 0));
    }, 0) + 1;

    return {
        transactionId: nextTransactionId,
        userId: transactionData.userId,
        type: transactionData.type,
        amount: Number(Number(transactionData.amount).toFixed(2)),
        balanceAfter: Number(Number(transactionData.balanceAfter).toFixed(2)),
        status: transactionData.status,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    PASS_PRICES,
    InsufficientBalanceError,
    getWalletDashboard,
    getOrCreateWallet,
    topUpWallet,
    purchasePass,
    getTransactionHistory
};
