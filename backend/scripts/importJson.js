const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const dataDirectory = path.join(__dirname, '..', 'data');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

function readJson(filename) {
  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

  return JSON.parse(rawData);
}

function convertIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return date;
}

async function createTables(connection) {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }

  console.log('Database tables created.');
}

async function importUsers(connection) {
  const users = readJson('user.json');

  for (const user of users) {
    await connection.execute(
      `
            INSERT INTO users (
                id,
                email,
                password,
                name,
                role
            )
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                password = VALUES(password),
                name = VALUES(name),
                role = VALUES(role)
            `,
      [user.id, user.email, user.password, user.name, user.role]
    );
  }

  console.log(`${users.length} users imported.`);
}

async function importBikes(connection) {
  const bikes = readJson('bikes.json');

  for (const bike of bikes) {
    await connection.execute(
      `
            INSERT INTO bikes (
                id,
                name,
                description,
                price,
                status,
                image
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                price = VALUES(price),
                status = VALUES(status),
                image = VALUES(image)
            `,
      [
        bike.id,
        bike.name,
        bike.description,
        bike.price,
        bike.status,
        bike.image,
      ]
    );
  }

  console.log(`${bikes.length} bikes imported.`);
}

async function importBikeStations(connection) {
  const stations = require(path.join(dataDirectory, 'bikeStations.js'));

  for (const station of stations) {
    await connection.execute(
      `
            INSERT INTO bike_stations (
                name,
                latitude,
                longitude
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                latitude = VALUES(latitude),
                longitude = VALUES(longitude)
            `,
      [station.name, station.lat, station.lng]
    );
  }

  console.log(`${stations.length} bike stations imported.`);
}

async function importRentals(connection) {
  const rentals = readJson('rentals.json');

  for (const rental of rentals) {
    await connection.execute(
      `
            INSERT INTO rentals (
                id,
                userId,
                userName,
                bikeId,
                bikeName,
                amount,
                status,
                rentedAt,
                returnedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId),
                userName = VALUES(userName),
                bikeId = VALUES(bikeId),
                bikeName = VALUES(bikeName),
                amount = VALUES(amount),
                status = VALUES(status),
                rentedAt = VALUES(rentedAt),
                returnedAt = VALUES(returnedAt)
            `,
      [
        rental.id,
        rental.userId,
        rental.userName,
        rental.bikeId,
        rental.bikeName,
        rental.amount,
        rental.status,
        convertIsoDate(rental.rentedAt),
        convertIsoDate(rental.returnedAt),
      ]
    );
  }

  console.log(`${rentals.length} rentals imported.`);
}

async function importWallets(connection) {
  const wallets = readJson('wallets.json');

  for (const wallet of wallets) {
    await connection.execute(
      `
            INSERT INTO wallets (
                userId,
                balance,
                tripCredits,
                dayPassCredits
            )
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                balance = VALUES(balance),
                tripCredits = VALUES(tripCredits),
                dayPassCredits = VALUES(dayPassCredits)
            `,
      [wallet.userId, wallet.balance, wallet.tripCredits, wallet.dayPassCredits]
    );
  }

  console.log(`${wallets.length} wallets imported.`);
}

async function importWalletTransactions(connection) {
  const transactions = readJson('wallet_transactions.json');

  for (const transaction of transactions) {
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
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId),
                type = VALUES(type),
                amount = VALUES(amount),
                balanceAfter = VALUES(balanceAfter),
                status = VALUES(status),
                timestamp = VALUES(timestamp)
            `,
      [
        transaction.transactionId,
        transaction.userId,
        transaction.type,
        transaction.amount,
        transaction.balanceAfter,
        transaction.status,
        convertIsoDate(transaction.timestamp),
      ]
    );
  }

  console.log(`${transactions.length} wallet transactions imported.`);
}

async function importRewards(connection) {
  const rewards = readJson('rewards.json');

  for (const [userId, reward] of Object.entries(rewards)) {
    await connection.execute(
      `
            INSERT INTO rewards (
                userId,
                points,
                freeHours,
                rides,
                totalMinutes,
                referralCode,
                friendsReferred,
                referredBy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                points = VALUES(points),
                freeHours = VALUES(freeHours),
                rides = VALUES(rides),
                totalMinutes = VALUES(totalMinutes),
                referralCode = VALUES(referralCode),
                friendsReferred = VALUES(friendsReferred),
                referredBy = VALUES(referredBy)
            `,
      [
        Number(userId),
        reward.points,
        reward.freeHours,
        reward.rides,
        reward.totalMinutes,
        reward.referralCode,
        reward.friendsReferred,
        reward.referredBy,
      ]
    );
  }

  console.log(`${Object.keys(rewards).length} reward records imported.`);
}

async function importLeaderboard(connection) {
  const leaderboard = readJson('leaderboard.json');

  for (const record of leaderboard) {
    await connection.execute(
      `
            INSERT INTO leaderboard (
                userId,
                userName,
                city,
                bikeName,
                distance,
                rides,
                lastRideAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                userName = VALUES(userName),
                city = VALUES(city),
                bikeName = VALUES(bikeName),
                distance = VALUES(distance),
                rides = VALUES(rides),
                lastRideAt = VALUES(lastRideAt)
            `,
      [
        record.userId,
        record.userName,
        record.city,
        record.bikeName,
        record.distance,
        record.rides,
        convertIsoDate(record.lastRideAt),
      ]
    );
  }

  console.log(`${leaderboard.length} leaderboard records imported.`);
}

async function importTracker(connection) {
  const tracker = readJson('tracker.json');

  for (const record of tracker) {
    await connection.execute(
      `
            INSERT INTO tracker (
                userId,
                userName,
                city,
                bikeName,
                distance,
                rides,
                lastRideAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                userName = VALUES(userName),
                city = VALUES(city),
                bikeName = VALUES(bikeName),
                distance = VALUES(distance),
                rides = VALUES(rides),
                lastRideAt = VALUES(lastRideAt)
            `,
      [
        record.userId,
        record.userName,
        record.city,
        record.bikeName,
        record.distance,
        record.rides,
        convertIsoDate(record.lastRideAt),
      ]
    );
  }

  console.log(`${tracker.length} tracker records imported.`);
}

async function importBikeRepairReports(connection) {
  const reports = readJson('bikeRepairReports.json');

  for (const report of reports) {
    await connection.execute(
      `
            INSERT INTO bike_repair_reports (
                id,
                bikeStation,
                bikeID,
                issueType,
                description,
                status,
                reportDate
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                bikeStation = VALUES(bikeStation),
                bikeID = VALUES(bikeID),
                issueType = VALUES(issueType),
                description = VALUES(description),
                status = VALUES(status),
                reportDate = VALUES(reportDate)
            `,
      [
        report.id,
        report.bikeStation,
        report.bikeID,
        report.issueType,
        report.description,
        report.status,
        report.date,
      ]
    );
  }

  console.log(`${reports.length} bike repair reports imported.`);
}

async function importTransactions(connection) {
  const transactions = readJson('transactions.json');

  if (transactions.length === 0) {
    console.log('transactions.json is empty. Nothing imported.');
    return;
  }

  for (const transaction of transactions) {
    await connection.execute(
      `
            INSERT INTO transactions (
                id,
                userId,
                type,
                amount,
                status,
                createdAt
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId),
                type = VALUES(type),
                amount = VALUES(amount),
                status = VALUES(status),
                createdAt = VALUES(createdAt)
            `,
      [
        transaction.id,
        transaction.userId ?? null,
        transaction.type ?? null,
        transaction.amount ?? null,
        transaction.status ?? null,
        transaction.createdAt
          ? convertIsoDate(transaction.createdAt)
          : new Date(),
      ]
    );
  }

  console.log(`${transactions.length} transaction records imported.`);
}

async function runImport() {
  const connection = await pool.getConnection();

  try {
    console.log('Starting MySQL import...');

    await createTables(connection);
    await connection.beginTransaction();

    await importUsers(connection);
    await importBikes(connection);
    await importBikeStations(connection);
    await importRentals(connection);
    await importWallets(connection);
    await importWalletTransactions(connection);
    await importRewards(connection);
    await importLeaderboard(connection);
    await importTracker(connection);
    await importBikeRepairReports(connection);
    await importTransactions(connection);

    await connection.commit();

    console.log('All JSON data imported successfully.');
  } catch (error) {
    await connection.rollback();

    console.error('Import failed:');
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

runImport();
