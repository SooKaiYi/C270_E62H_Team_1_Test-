const pool = require("../config/database");

const PASS_PRICES = {
    two_way_trip: {
        label: "2 Way Trip",
        price: 5.0,
        credits: 2,
        transactionType: "2 Way Trip"
    },

    day_pass: {
        label: "Day Pass",
        price: 10.0,
        credits: 10,
        transactionType: "Day Pass"
    }
};

class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message);
        this.name = "InsufficientBalanceError";
    }
}

function normalizeUserId(userId) {
    const numericUserId = Number(userId);

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        throw new Error("Invalid user ID.");
    }

    return numericUserId;
}

// =======================================
// Get or create wallet
// =======================================

async function getOrCreateWallet(userId) {
    const numericUserId = normalizeUserId(userId);

    await pool.execute(
        `
        INSERT INTO wallets (
            userId,
            balance,
            tripCredits,
            dayPassCredits
        )
        VALUES (?, 0, 0, 0)
        ON DUPLICATE KEY UPDATE
            userId = VALUES(userId)
        `,
        [numericUserId]
    );

    const [rows] = await pool.execute(
        `
        SELECT
            userId,
            balance,
            tripCredits,
            dayPassCredits
        FROM wallets
        WHERE userId = ?
        LIMIT 1
        `,
        [numericUserId]
    );

    const wallet = rows[0];

    if (!wallet) {
        throw new Error("Unable to retrieve wallet.");
    }

    return {
        ...wallet,
        balance: Number(wallet.balance),
        tripCredits: Number(wallet.tripCredits),
        dayPassCredits: Number(wallet.dayPassCredits)
    };
}

// =======================================
// Wallet dashboard
// =======================================

async function getWalletDashboard(userId) {
    const wallet = await getOrCreateWallet(userId);
    const transactions = await getTransactionHistory(userId);

    return {
        wallet,
        transactions: transactions.slice(0, 5)
    };
}

// =======================================
// Top up wallet
// =======================================

async function topUpWallet(userId, amount) {
    const numericUserId = normalizeUserId(userId);
    const topUpAmount = Number(amount);

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
        throw new Error("Top-up amount must be more than 0.");
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            `
            INSERT INTO wallets (
                userId,
                balance,
                tripCredits,
                dayPassCredits
            )
            VALUES (?, 0, 0, 0)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId)
            `,
            [numericUserId]
        );

        const [walletRows] = await connection.execute(
            `
            SELECT
                balance
            FROM wallets
            WHERE userId = ?
            FOR UPDATE
            `,
            [numericUserId]
        );

        const currentBalance = Number(walletRows[0].balance);

        const balanceAfter = Number(
            (currentBalance + topUpAmount).toFixed(2)
        );

        await connection.execute(
            `
            UPDATE wallets
            SET balance = ?
            WHERE userId = ?
            `,
            [balanceAfter, numericUserId]
        );

        await connection.execute(
            `
            INSERT INTO wallet_transactions (
                userId,
                type,
                amount,
                balanceAfter,
                status,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, NOW(3))
            `,
            [
                numericUserId,
                "Top Up",
                Number(topUpAmount.toFixed(2)),
                balanceAfter,
                "Success"
            ]
        );

        await connection.commit();

        return balanceAfter;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// =======================================
// Purchase pass
// =======================================

async function purchasePass(userId, passType) {
    const numericUserId = normalizeUserId(userId);
    const selectedPass = PASS_PRICES[passType];

    if (!selectedPass) {
        throw new Error("Please choose a valid pass.");
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            `
            INSERT INTO wallets (
                userId,
                balance,
                tripCredits,
                dayPassCredits
            )
            VALUES (?, 0, 0, 0)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId)
            `,
            [numericUserId]
        );

        const [walletRows] = await connection.execute(
            `
            SELECT
                balance,
                tripCredits,
                dayPassCredits
            FROM wallets
            WHERE userId = ?
            FOR UPDATE
            `,
            [numericUserId]
        );

        const wallet = walletRows[0];

        const currentBalance = Number(wallet.balance);
        let tripCredits = Number(wallet.tripCredits);
        let dayPassCredits = Number(wallet.dayPassCredits);

        if (currentBalance < selectedPass.price) {
            await connection.execute(
                `
                INSERT INTO wallet_transactions (
                    userId,
                    type,
                    amount,
                    balanceAfter,
                    status,
                    timestamp
                )
                VALUES (?, ?, ?, ?, ?, NOW(3))
                `,
                [
                    numericUserId,
                    selectedPass.transactionType,
                    selectedPass.price,
                    currentBalance,
                    "Failed"
                ]
            );

            await connection.commit();

            throw new InsufficientBalanceError(
                "Insufficient wallet balance. Please top up credits first."
            );
        }

        const balanceAfter = Number(
            (currentBalance - selectedPass.price).toFixed(2)
        );

        if (passType === "two_way_trip") {
            tripCredits += selectedPass.credits;
        }

        if (passType === "day_pass") {
            dayPassCredits += selectedPass.credits;
        }

        await connection.execute(
            `
            UPDATE wallets
            SET
                balance = ?,
                tripCredits = ?,
                dayPassCredits = ?
            WHERE userId = ?
            `,
            [
                balanceAfter,
                tripCredits,
                dayPassCredits,
                numericUserId
            ]
        );

        await connection.execute(
            `
            INSERT INTO wallet_transactions (
                userId,
                type,
                amount,
                balanceAfter,
                status,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, NOW(3))
            `,
            [
                numericUserId,
                selectedPass.transactionType,
                selectedPass.price,
                balanceAfter,
                "Success"
            ]
        );

        await connection.commit();

        return {
            pass: selectedPass,
            balanceAfter
        };
    } catch (error) {
        if (
            error instanceof InsufficientBalanceError ||
            error.name === "InsufficientBalanceError"
        ) {
            throw error;
        }

        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// =======================================
// Transaction history
// =======================================

async function getTransactionHistory(userId) {
    const numericUserId = normalizeUserId(userId);

    const [rows] = await pool.execute(
        `
        SELECT
            transactionId,
            userId,
            type,
            amount,
            balanceAfter,
            status,
            timestamp
        FROM wallet_transactions
        WHERE userId = ?
        ORDER BY timestamp DESC, transactionId DESC
        `,
        [numericUserId]
    );

    return rows.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        balanceAfter: Number(transaction.balanceAfter)
    }));
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