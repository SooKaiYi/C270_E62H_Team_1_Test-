const pool = require("../config/database");

async function fixBikeRepairTable() {
    try {
        await pool.execute(`
            ALTER TABLE bike_repair_reports
            MODIFY id BIGINT NOT NULL AUTO_INCREMENT
        `);

        console.log(
            "bike_repair_reports.id now uses AUTO_INCREMENT."
        );
    } catch (error) {
        console.error(
            "Unable to update bike repair table:",
            error.message
        );

        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

fixBikeRepairTable();