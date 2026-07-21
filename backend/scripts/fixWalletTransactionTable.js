const pool = require('../config/database');

async function fixWalletTransactionTable() {
  try {
    console.log('Updating wallet_transactions table...');

    await pool.execute(`
            ALTER TABLE wallet_transactions
            MODIFY transactionId INT NOT NULL AUTO_INCREMENT
        `);

    console.log('wallet_transactions.transactionId now uses AUTO_INCREMENT.');
  } catch (error) {
    console.error('Unable to update wallet_transactions table:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

fixWalletTransactionTable();
