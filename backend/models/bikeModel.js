const pool = require('../config/database');

// ==============================
// Get all bikes
// ==============================
async function getAllBikes() {
  const [rows] = await pool.execute(`
        SELECT
            id,
            name,
            description,
            price,
            status,
            image
        FROM bikes
        ORDER BY id
    `);

  return rows;
}

// ==============================
// Find bike by ID
// ==============================
async function getBikeById(id) {
  const [rows] = await pool.execute(
    `
        SELECT
            id,
            name,
            description,
            price,
            status,
            image
        FROM bikes
        WHERE id = ?
        LIMIT 1
        `,
    [id]
  );

  return rows[0] || null;
}

// ==============================
// Add bike
// ==============================
async function addBike(bikeData) {
  const name = bikeData.name?.trim();
  const description = bikeData.description?.trim() || '';
  const price = Number(bikeData.price);
  const image = bikeData.image?.trim() || '/images/default-bike.jpg';

  if (!name) {
    throw new Error('Bike name is required.');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Bike price must be a valid number.');
  }

  const [result] = await pool.execute(
    `
        INSERT INTO bikes (
            name,
            description,
            price,
            status,
            image
        )
        VALUES (?, ?, ?, ?, ?)
        `,
    [name, description, price, 'Available', image]
  );

  return getBikeById(result.insertId);
}

// ==============================
// Update bike
// ==============================
async function updateBike(id, bikeData) {
  const name = bikeData.name?.trim();
  const description = bikeData.description?.trim() || '';
  const price = Number(bikeData.price);
  const status = bikeData.status?.trim() || 'Available';
  const image = bikeData.image?.trim() || '/images/default-bike.jpg';

  if (!name) {
    throw new Error('Bike name is required.');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Bike price must be a valid number.');
  }

  const [result] = await pool.execute(
    `
        UPDATE bikes
        SET
            name = ?,
            description = ?,
            price = ?,
            status = ?,
            image = ?
        WHERE id = ?
        `,
    [name, description, price, status, image, id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Bike not found.');
  }

  return getBikeById(id);
}

// ==============================
// Delete bike
// ==============================
async function deleteBike(id) {
  try {
    const [result] = await pool.execute(
      `
            DELETE FROM bikes
            WHERE id = ?
            `,
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Bike not found.');
    }

    return true;
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new Error(
        'This bike cannot be deleted because it has rental records.', {cause: error}
      );
    }

    throw error;
  }
}

// ==============================
// Change bike status
// ==============================
async function updateBikeStatus(id, status) {
  const allowedStatuses = ['Available', 'Rented', 'Maintenance', 'Unavailable'];

  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid bike status.');
  }

  const [result] = await pool.execute(
    `
        UPDATE bikes
        SET status = ?
        WHERE id = ?
        `,
    [status, id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Bike not found.');
  }

  return getBikeById(id);
}

module.exports = {
  getAllBikes,
  getBikeById,
  addBike,
  updateBike,
  deleteBike,
  updateBikeStatus,
};
