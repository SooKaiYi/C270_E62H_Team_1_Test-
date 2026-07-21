const pool = require('../config/database');

async function fixBikeTable() {
  const connection = await pool.getConnection();

  try {
    console.log('Updating bikes.id to AUTO_INCREMENT...');

    await connection.beginTransaction();

    // 1. Temporarily remove the foreign key
    await connection.execute(`
            ALTER TABLE rentals
            DROP FOREIGN KEY fk_rentals_bike
        `);

    console.log('Rental-bike foreign key removed temporarily.');

    // 2. Ensure both related columns have matching INT types
    await connection.execute(`
            ALTER TABLE bikes
            MODIFY id INT NOT NULL AUTO_INCREMENT
        `);

    await connection.execute(`
            ALTER TABLE rentals
            MODIFY bikeId INT NOT NULL
        `);

    console.log('bikes.id now uses AUTO_INCREMENT.');

    // 3. Restore the foreign key
    await connection.execute(`
            ALTER TABLE rentals
            ADD CONSTRAINT fk_rentals_bike
            FOREIGN KEY (bikeId)
            REFERENCES bikes(id)
        `);

    await connection.commit();

    console.log('Rental-bike foreign key restored.');
    console.log('Bike table updated successfully.');
  } catch (error) {
    await connection.rollback();

    console.error('Unable to update bikes table:');
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

fixBikeTable();
