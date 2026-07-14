const { readJson, writeJson } = require('./jsonFileModel');
const trackerModel = require('./trackerModel');

function normalizeLeaderboardEntries(entries) {
    return entries.map((entry) => ({
        ...entry,
        userName: entry.userName || 'Unknown Rider',
        bikeName: entry.bikeName || 'Unknown Bike',
        city: entry.city || 'Your City',
        distance: Number(entry.distance) || 0,
        rides: Number(entry.rides) || 0,
        lastRideAt: entry.lastRideAt || null
    }));
}

async function getLatestBikeName(userId) {
    const rentals = await readJson('rentals.json', []);
    const normalizedUserId = Number(userId);
    const userRentals = rentals
        .filter((rental) => Number(rental.userId) === normalizedUserId && rental.bikeName)
        .sort((a, b) => {
            const dateA = new Date(a.returnedAt || a.rentedAt).getTime();
            const dateB = new Date(b.returnedAt || b.rentedAt).getTime();
            return dateB - dateA;
        });

    return userRentals.length > 0 ? userRentals[0].bikeName : null;
}

async function loadLeaderboardEntries() {
    const entries = await readJson('leaderboard.json', []);
    return normalizeLeaderboardEntries(entries);
}

async function saveLeaderboardEntries(entries) {
    await writeJson('leaderboard.json', normalizeLeaderboardEntries(entries));
}

async function refreshLeaderboard() {
    const baseEntries = await loadLeaderboardEntries();
    const trackerEntries = await readJson('tracker.json', []);
    const mergedByUser = new Map();

    baseEntries.forEach((entry) => {
        if (entry.userId != null) {
            mergedByUser.set(Number(entry.userId), entry);
        }
    });

    for (const trackerEntry of trackerEntries) {
        const userId = Number(trackerEntry.userId);
        const latestBike = trackerEntry.bikeName || (await getLatestBikeName(userId)) || 'Unknown Bike';
        const existing = mergedByUser.get(userId) || {};

        mergedByUser.set(userId, {
            userId,
            userName: trackerEntry.userName || existing.userName || 'Unknown Rider',
            city: trackerEntry.city || existing.city || 'Your City',
            bikeName: latestBike,
            distance: Number(trackerEntry.distance) || 0,
            rides: Number(trackerEntry.rides) || existing.rides || 0,
            lastRideAt: trackerEntry.lastRideAt || existing.lastRideAt || null
        });
    }

    const merged = Array.from(mergedByUser.values());
    await saveLeaderboardEntries(merged);
    return merged;
}

async function getLeaderboard(user) {
    let leaderboardEntries = await loadLeaderboardEntries();

    if (leaderboardEntries.length === 0) {
        leaderboardEntries = await refreshLeaderboard();
    } else {
        leaderboardEntries = await refreshLeaderboard();
    }

    const sorted = leaderboardEntries.sort((a, b) => b.distance - a.distance);

    const global = sorted;
    const friends = sorted.filter((entry) => entry.userId === Number(user.id) || entry.userName === user.name);

    return {
        global,
        friends: friends.length > 0 ? friends : [
            {
                userId: Number(user.id),
                userName: user.name,
                city: 'Your City',
                bikeName: await getLatestBikeName(user.id) || 'Unknown Bike',
                distance: Number(((await trackerModel.getTrackerByUser(user.id)) || {}).distance) || 0,
                rides: Number(((await trackerModel.getTrackerByUser(user.id)) || {}).rides) || 0,
                lastRideAt: ((await trackerModel.getTrackerByUser(user.id)) || {}).lastRideAt || null
            }
        ]
    };
}

module.exports = {
    getLeaderboard,
    refreshLeaderboard
};
