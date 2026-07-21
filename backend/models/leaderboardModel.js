const pool = require('../config/database');
const trackerModel = require('./trackerModel');

function normalizeEntry(entry) {
  return {
    ...entry,
    userId: Number(entry.userId),
    userName: entry.userName || 'Unknown Rider',
    bikeName: entry.bikeName || 'Unknown Bike',
    city: entry.city || 'Your City',
    distance: Number(entry.distance) || 0,
    rides: Number(entry.rides) || 0,
    lastRideAt: entry.lastRideAt || null,
  };
}

async function getLatestBikeName(userId) {
  const [rows] = await pool.execute(
    `
        SELECT bikeName
        FROM rentals
        WHERE userId = ?
          AND bikeName IS NOT NULL
        ORDER BY COALESCE(returnedAt, rentedAt) DESC
        LIMIT 1
        `,
    [userId]
  );

  return rows[0]?.bikeName || null;
}

async function refreshLeaderboard() {
  const [trackerEntries] = await pool.execute(`
        SELECT
            userId,
            userName,
            city,
            bikeName,
            distance,
            rides,
            lastRideAt
        FROM tracker
    `);

  for (const trackerEntry of trackerEntries) {
    const latestBike =
      trackerEntry.bikeName ||
      (await getLatestBikeName(trackerEntry.userId)) ||
      'Unknown Bike';

    await pool.execute(
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
        trackerEntry.userId,
        trackerEntry.userName || 'Unknown Rider',
        trackerEntry.city || 'Your City',
        latestBike,
        Number(trackerEntry.distance) || 0,
        Number(trackerEntry.rides) || 0,
        trackerEntry.lastRideAt || null,
      ]
    );
  }

  const [rows] = await pool.execute(`
        SELECT
            userId,
            userName,
            city,
            bikeName,
            distance,
            rides,
            lastRideAt
        FROM leaderboard
        ORDER BY distance DESC, rides DESC
    `);

  return rows.map(normalizeEntry);
}

async function getLeaderboard(user) {
  const leaderboardEntries = await refreshLeaderboard();

  const global = [...leaderboardEntries].sort(
    (a, b) => b.distance - a.distance
  );

  let friends = global.filter(
    (entry) => entry.userId === Number(user.id) || entry.userName === user.name
  );

  if (friends.length === 0) {
    const tracker = await trackerModel.getTrackerByUser(user.id);

    friends = [
      {
        userId: Number(user.id),
        userName: user.name,
        city: tracker?.city || 'Your City',
        bikeName:
          tracker?.bikeName ||
          (await getLatestBikeName(user.id)) ||
          'Unknown Bike',
        distance: Number(tracker?.distance) || 0,
        rides: Number(tracker?.rides) || 0,
        lastRideAt: tracker?.lastRideAt || null,
      },
    ];
  }

  return {
    global,
    friends,
  };
}

module.exports = {
  getLeaderboard,
  refreshLeaderboard,
};
