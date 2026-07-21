const pool = require("../config/database");

async function getAdminWalletDashboard() {
    const [walletRows] = await pool.execute(`
        SELECT
            u.id AS userId,
            u.name,
            u.email,
            COALESCE(w.balance, 0) AS balance,
            COUNT(wt.transactionId) AS transactionCount
        FROM users u
        LEFT JOIN wallets w
            ON w.userId = u.id
        LEFT JOIN wallet_transactions wt
            ON wt.userId = u.id
        WHERE LOWER(u.role) = 'member'
        GROUP BY
            u.id,
            u.name,
            u.email,
            w.balance
        ORDER BY u.id
    `);

    const [transactionRows] = await pool.execute(`
        SELECT
            wt.transactionId,
            wt.userId,
            wt.type,
            wt.amount,
            wt.balanceAfter,
            wt.status,
            wt.timestamp,
            COALESCE(u.name, 'Unknown User') AS userName,
            COALESCE(u.email, '-') AS userEmail
        FROM wallet_transactions wt
        LEFT JOIN users u
            ON u.id = wt.userId
        ORDER BY
            wt.timestamp DESC,
            wt.transactionId DESC
    `);

    const [statisticsRows] = await pool.execute(`
        SELECT
            (
                SELECT COUNT(*)
                FROM users
                WHERE LOWER(role) = 'member'
            ) AS totalMembers,

            (
                SELECT COALESCE(SUM(w.balance), 0)
                FROM wallets w
                INNER JOIN users u
                    ON u.id = w.userId
                WHERE LOWER(u.role) = 'member'
            ) AS totalWalletBalance,

            (
                SELECT COUNT(*)
                FROM wallet_transactions
            ) AS totalTransactions,

            (
                SELECT COALESCE(SUM(amount), 0)
                FROM wallet_transactions
                WHERE
                    LOWER(type) LIKE '%top up%'
                    OR LOWER(type) LIKE '%top-up%'
            ) AS totalTopUps,

            (
                SELECT COALESCE(SUM(ABS(amount)), 0)
                FROM wallet_transactions
                WHERE
                    LOWER(type) LIKE '%pass%'
                    OR LOWER(type) LIKE '%trip%'
                    OR LOWER(type) LIKE '%rental%'
                    OR LOWER(type) LIKE '%spend%'
            ) AS totalSpending
    `);

    const statistics = statisticsRows[0];

    return {
        wallets: walletRows.map((wallet) => ({
            ...wallet,
            balance: Number(wallet.balance),
            transactionCount: Number(wallet.transactionCount)
        })),

        transactions: transactionRows.map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
            balanceAfter: Number(transaction.balanceAfter)
        })),

        statistics: {
            totalMembers: Number(statistics.totalMembers),
            totalWalletBalance: Number(
                statistics.totalWalletBalance
            ),
            totalTransactions: Number(
                statistics.totalTransactions
            ),
            totalTopUps: Number(statistics.totalTopUps),
            totalSpending: Number(statistics.totalSpending)
        }
    };
}

module.exports = {
    getAdminWalletDashboard
};