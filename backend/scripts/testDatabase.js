const pool = require('../config/database');

async function testDatabase() {
  try {
    const [rows] = await pool.query('SELECT NOW() AS databaseTime');

    console.log('Connected to Aiven MySQL.');
    console.log(rows);
  } catch (error) {
    console.error('Database connection failed:');
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
