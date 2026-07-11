const fs = require('fs').promises;
const path = require('path');

const DATA_DIRECTORY = path.join(__dirname, '..', 'data');

const USERS_FILE = path.join(DATA_DIRECTORY, 'user.json');
const WALLETS_FILE = path.join(DATA_DIRECTORY, 'wallets.json');
const TRANSACTIONS_FILE = path.join(
    DATA_DIRECTORY,
    'wallet_transactions.json'
);

async function readJsonFile(filePath) {
    try {
        const contents = await fs.readFile(filePath, 'utf8');
        return JSON.parse(contents);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }

        throw error;
    }
}

function extractArray(data, possibleKeys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    for (const key of possibleKeys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

async function getAdminWalletDashboard() {
    const [usersData, walletsData, transactionsData] =
        await Promise.all([
            readJsonFile(USERS_FILE),
            readJsonFile(WALLETS_FILE),
            readJsonFile(TRANSACTIONS_FILE)
        ]);

    const users = extractArray(usersData, ['users']);
    const wallets = extractArray(walletsData, ['wallets']);
    const transactions = extractArray(
        transactionsData,
        ['transactions']
    );

    const walletRows = users
        .filter((user) =>
            String(user.role || '').toLowerCase() === 'member'
        )
        .map((user) => {
            const wallet = wallets.find(
                (item) =>
                    String(item.userId) === String(user.id)
            );

            const userTransactions = transactions.filter(
                (transaction) =>
                    String(transaction.userId) === String(user.id)
            );

            return {
                userId: user.id,
                name: user.name || user.username || 'Unknown Member',
                email: user.email || '-',
                balance: Number(wallet?.balance || 0),
                transactionCount: userTransactions.length
            };
        });

    const totalBalance = walletRows.reduce(
        (sum, wallet) => sum + wallet.balance,
        0
    );

    const totalTopUps = transactions
        .filter((transaction) =>
            String(transaction.type || '')
                .toLowerCase()
                .includes('top')
        )
        .reduce(
            (sum, transaction) =>
                sum + Number(transaction.amount || 0),
            0
        );

    const totalSpending = transactions
        .filter((transaction) => {
            const type = String(
                transaction.type || ''
            ).toLowerCase();

            return (
                type.includes('pass') ||
                type.includes('trip') ||
                type.includes('rental') ||
                type.includes('spend')
            );
        })
        .reduce(
            (sum, transaction) =>
                sum + Math.abs(Number(transaction.amount || 0)),
            0
        );

    const enrichedTransactions = transactions
        .map((transaction) => {
            const user = users.find(
                (item) =>
                    String(item.id) ===
                    String(transaction.userId)
            );

            return {
                ...transaction,
                userName:
                    user?.name ||
                    user?.username ||
                    'Unknown User',
                userEmail: user?.email || '-'
            };
        })
        .sort(
            (a, b) =>
                new Date(b.timestamp || b.date || 0) -
                new Date(a.timestamp || a.date || 0)
        );

    return {
        wallets: walletRows,
        transactions: enrichedTransactions,
        statistics: {
            totalMembers: walletRows.length,
            totalWalletBalance: totalBalance,
            totalTransactions: transactions.length,
            totalTopUps,
            totalSpending
        }
    };
}

module.exports = {
    getAdminWalletDashboard
};