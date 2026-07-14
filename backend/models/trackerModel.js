const { readJson, writeJson } = require('./jsonFileModel');

let trackerWriteQueue = Promise.resolve();

function normalizeUserId(userId) {
    return Number(userId);
}

function runTrackerWrite(task) {
    trackerWriteQueue = trackerWriteQueue.then(task, task);
    return trackerWriteQueue;
}

async function getAllTrackers() {
    return await readJson('tracker.json', []);
}

async function getTrackerByUser(userId) {
    const trackers = await getAllTrackers();
    const normalizedUserId = normalizeUserId(userId);
    return trackers.find((entry) => entry.userId === normalizedUserId) || null;
}

async function saveRideDistance(user, distance, bikeName = null) {
    return runTrackerWrite(async () => {
        const trackers = await getAllTrackers();
        const normalizedUserId = normalizeUserId(user.id || user.userId);

        let trackerEntry = trackers.find(
            (entry) => entry.userId === normalizedUserId
        );

        if (!trackerEntry) {
            trackerEntry = {
                userId: normalizedUserId,
                userName: user.name || user.userName || 'Unknown Rider',
                city: user.city || 'Your City',
                bikeName: bikeName || 'Unknown Bike',
                distance: 0,
                rides: 0,
                lastRideAt: null
            };
            trackers.push(trackerEntry);
        }

        trackerEntry.distance = Number(
            (Number(trackerEntry.distance) + Number(distance)).toFixed(2)
        );
        trackerEntry.bikeName = trackerEntry.bikeName || bikeName || 'Unknown Bike';
        trackerEntry.rides = (trackerEntry.rides || 0) + 1;
        trackerEntry.lastRideAt = new Date().toISOString();

        await writeJson('tracker.json', trackers);

        return trackerEntry;
    });
}

module.exports = {
    getAllTrackers,
    getTrackerByUser,
    saveRideDistance
};
