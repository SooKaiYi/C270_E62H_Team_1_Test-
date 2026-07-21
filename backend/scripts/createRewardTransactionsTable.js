const pool = require('../config/database');

async function createRewardTransactionsTable() {
  try {
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS reward_transactions (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                points INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                description VARCHAR(500) NOT NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

                CONSTRAINT fk_reward_transactions_user
                    FOREIGN KEY (userId)
                    REFERENCES users(id)
            )
        `);

    console.log('reward_transactions table is ready.');
  } catch (error) {
    console.error('Unable to create reward_transactions table:', error.message);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createRewardTransactionsTable();
