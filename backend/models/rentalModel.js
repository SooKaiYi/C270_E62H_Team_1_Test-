const pool = require('../config/database');
const { InsufficientBalanceError } = require('./walletModel');

// =======================================
// Get All Rentals
// =======================================

async function getAllRentals() {
  const [rows] = await pool.execute(`
        SELECT
            id,
            userId,
            userName,
            bikeId,
            bikeName,
            amount,
            paymentMethod,
            status,
            rentedAt,
            returnedAt
        FROM rentals
        ORDER BY rentedAt DESC
    `);

  return rows;
}

// =======================================
// Get Rentals By User
// =======================================

async function getUserRentals(userId) {
  const [rows] = await pool.execute(
    `
        SELECT
            id,
            userId,
            userName,
            bikeId,
            bikeName,
            amount,
            paymentMethod,
            status,
            rentedAt,
            returnedAt
        FROM rentals
        WHERE userId = ?
        ORDER BY rentedAt DESC
        `,
    [userId]
  );

  return rows;
}

// =======================================
// Rent Bike
// =======================================

async function rentBike(user) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bikeRows] = await connection.execute(
      `
            SELECT
                id,
                name,
                price,
                status
            FROM bikes
            WHERE id = ?
            FOR UPDATE
            `,
      [user.bikeId]
    );

    const bike = bikeRows[0];

    if (!bike) {
      throw new Error('Bike not found.');
    }

    if (bike.status === 'Rented') {
      throw new Error('This bike has already been rented.');
    }

    const [walletRows] = await connection.execute(
      `
            SELECT
                userId,
                balance,
                tripCredits,
                dayPassCredits
            FROM wallets
            WHERE userId = ?
            FOR UPDATE
            `,
      [user.userId]
    );

    const wallet = walletRows[0];

    if (!wallet) {
      throw new Error('Wallet not found.');
    }

    let balance = Number(wallet.balance);
    let tripCredits = Number(wallet.tripCredits || 0);
    let dayPassCredits = Number(wallet.dayPassCredits || 0);

    const bikePrice = Number(bike.price);

    let paymentMethod;
    let chargedAmount = bikePrice;

    if (dayPassCredits > 0) {
      dayPassCredits -= 1;
      paymentMethod = 'Day Pass';
      chargedAmount = 0;
    } else if (tripCredits > 0) {
      tripCredits -= 1;
      paymentMethod = '2 Way Trip';
      chargedAmount = 0;
    } else if (balance >= bikePrice) {
      balance = Number((balance - bikePrice).toFixed(2));

      paymentMethod = 'Wallet';
    } else {
      const error = new InsufficientBalanceError(
        'Insufficient wallet balance. Please top up credits first.'
      );

      error.balance = balance;
      error.required = bikePrice;

      throw error;
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
      [balance, tripCredits, dayPassCredits, user.userId]
    );

    await connection.execute(
      `
            UPDATE bikes
            SET status = 'Rented'
            WHERE id = ?
            `,
      [bike.id]
    );

    const [rentalResult] = await connection.execute(
      `
            INSERT INTO rentals (
                userId,
                userName,
                bikeId,
                bikeName,
                amount,
                paymentMethod,
                status,
                rentedAt,
                returnedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NULL)
            `,
      [
        user.userId,
        user.userName,
        bike.id,
        bike.name,
        chargedAmount,
        paymentMethod,
        'Active',
      ]
    );

    await connection.execute(
      `
            INSERT INTO wallet_transactions (
                transactionId,
                userId,
                type,
                amount,
                balanceAfter,
                status,
                timestamp
            )
            SELECT
                COALESCE(MAX(transactionId), 0) + 1,
                ?,
                ?,
                ?,
                ?,
                'Success',
                NOW(3)
            FROM wallet_transactions
            `,
      [user.userId, `${paymentMethod} - Bike Rental`, chargedAmount, balance]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `
            SELECT *
            FROM rentals
            WHERE id = ?
            `,
      [rentalResult.insertId]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =======================================
// Return Bike
// =======================================

async function returnBike(rentalId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rentalRows] = await connection.execute(
      `
            SELECT
                id,
                bikeId,
                status
            FROM rentals
            WHERE id = ?
            FOR UPDATE
            `,
      [rentalId]
    );

    const rental = rentalRows[0];

    if (!rental) {
      throw new Error('Rental not found.');
    }

    if (rental.status === 'Returned') {
      throw new Error('This rental has already been returned.');
    }

    await connection.execute(
      `
            UPDATE rentals
            SET
                status = 'Returned',
                returnedAt = NOW(3)
            WHERE id = ?
            `,
      [rentalId]
    );

    await connection.execute(
      `
            UPDATE bikes
            SET status = 'Available'
            WHERE id = ?
            `,
      [rental.bikeId]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `
            SELECT *
            FROM rentals
            WHERE id = ?
            `,
      [rentalId]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =======================================
// Update Rental
// =======================================

async function updateRental(rentalId, updatedData) {
  const allowedStatuses = ['Active', 'Returned', 'Cancelled'];

  const status = updatedData.status;

  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid rental status.');
  }

  const returnedAt = updatedData.returnedAt || null;

  const [result] = await pool.execute(
    `
        UPDATE rentals
        SET
            status = ?,
            returnedAt = ?
        WHERE id = ?
        `,
    [status, returnedAt, rentalId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Rental not found.');
  }

  const [rows] = await pool.execute(
    `
        SELECT *
        FROM rentals
        WHERE id = ?
        `,
    [rentalId]
  );

  return rows[0];
}

// =======================================
// Delete Rental
// =======================================

async function deleteRental(rentalId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rentalRows] = await connection.execute(
      `
            SELECT
                id,
                bikeId,
                status
            FROM rentals
            WHERE id = ?
            FOR UPDATE
            `,
      [rentalId]
    );

    const rental = rentalRows[0];

    if (!rental) {
      throw new Error('Rental not found.');
    }

    if (rental.status === 'Active') {
      await connection.execute(
        `
                UPDATE bikes
                SET status = 'Available'
                WHERE id = ?
                `,
        [rental.bikeId]
      );
    }

    await connection.execute(
      `
            DELETE FROM rentals
            WHERE id = ?
            `,
      [rentalId]
    );

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllRentals,
  getUserRentals,
  rentBike,
  returnBike,
  updateRental,
  deleteRental,
};
