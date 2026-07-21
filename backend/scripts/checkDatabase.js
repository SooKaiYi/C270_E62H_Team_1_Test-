const pool = require("../config/database");

async function checkDatabase() {
    try {
        const tables = [
            "users",
            "bikes",
            "bike_stations",
            "rentals",
            "wallets",
            "wallet_transactions",
            "rewards",
            "leaderboard",
            "tracker",
            "bike_repair_reports",
            "transactions"
        ];

        for (const table of tables) {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total FROM \`${table}\``
            );

            console.log(`${table}: ${rows[0].total} records`);
        }
    } catch (error) {
        console.error("Database check failed:", error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();