const pool = require("../config/database");

function normalizeUserId(userId) {
    const numericUserId = Number(userId);

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        throw new Error("Invalid user ID.");
    }

    return numericUserId;
}

function normalizeTracker(entry) {
    if (!entry) {
        return null;
    }

    return {
        ...entry,
        userId: Number(entry.userId),
        distance: Number(entry.distance) || 0,
        rides: Number(entry.rides) || 0
    };
}

async function getAllTrackers() {
    const [rows] = await pool.execute(`
        SELECT
            userId,
            userName,
            city,
            bikeName,
            distance,
            rides,
            lastRideAt
        FROM tracker
        ORDER BY distance DESC, rides DESC
    `);

    return rows.map(normalizeTracker);
}

async function getTrackerByUser(userId) {
    const numericUserId = normalizeUserId(userId);

    const [rows] = await pool.execute(
        `
        SELECT
            userId,
            userName,
            city,
            bikeName,
            distance,
            rides,
            lastRideAt
        FROM tracker
        WHERE userId = ?
        LIMIT 1
        `,
        [numericUserId]
    );

    return normalizeTracker(rows[0]);
}

async function saveRideDistance(user, distance, bikeName = null) {
    const numericUserId = normalizeUserId(
        user.id || user.userId
    );

    const rideDistance = Number(distance);

    if (!Number.isFinite(rideDistance) || rideDistance < 0) {
        throw new Error("Invalid distance.");
    }

    const userName =
        user.name || user.userName || "Unknown Rider";

    const city = user.city || "Your City";

    const selectedBikeName =
        bikeName || "Unknown Bike";

    await pool.execute(
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
        VALUES (?, ?, ?, ?, ?, 1, NOW(3))
        ON DUPLICATE KEY UPDATE
            userName = VALUES(userName),
            city = VALUES(city),
            bikeName = CASE
                WHEN VALUES(bikeName) = 'Unknown Bike'
                    THEN bikeName
                ELSE VALUES(bikeName)
            END,
            distance = ROUND(distance + VALUES(distance), 2),
            rides = rides + 1,
            lastRideAt = NOW(3)
        `,
        [
            numericUserId,
            userName,
            city,
            selectedBikeName,
            rideDistance
        ]
    );

    return getTrackerByUser(numericUserId);
}

module.exports = {
    getAllTrackers,
    getTrackerByUser,
    saveRideDistance
};