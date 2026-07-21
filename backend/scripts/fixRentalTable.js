const pool = require("../config/database");

async function fixRentalTable() {
    const connection = await pool.getConnection();

    try {
        console.log("Updating rentals table...");

        await connection.execute(`
            ALTER TABLE rentals
            MODIFY id INT NOT NULL AUTO_INCREMENT
        `);

        console.log("rentals.id now uses AUTO_INCREMENT.");

        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM rentals LIKE 'paymentMethod'
        `);

        if (columns.length === 0) {
            await connection.execute(`
                ALTER TABLE rentals
                ADD COLUMN paymentMethod VARCHAR(50)
                NOT NULL DEFAULT 'Wallet'
                AFTER amount
            `);

            console.log("paymentMethod column added.");
        } else {
            console.log("paymentMethod column already exists.");
        }

        console.log("Rentals table updated successfully.");
    } catch (error) {
        console.error("Unable to update rentals table:");
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
    }
}

fixRentalTable();