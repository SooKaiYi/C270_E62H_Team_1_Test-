jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const trackerModel = require('../../../backend/models/trackerModel');

beforeEach(() => {
    db._reset();
});

describe('saveRideDistance', () => {
    test('rejects an invalid user id', async () => {
        await expect(trackerModel.saveRideDistance({ id: -1 }, 5)).rejects.toThrow(/invalid user id/i);
    });

    test('rejects a negative distance', async () => {
        await expect(trackerModel.saveRideDistance({ id: 2 }, -5)).rejects.toThrow(/invalid distance/i);
    });

    test('creates a new tracker entry on the first ride', async () => {
        const tracker = await trackerModel.saveRideDistance({ id: 2, name: 'Member User', city: 'Singapore' }, 3.5, 'City Bike');
        expect(tracker).toMatchObject({ userId: 2, distance: 3.5, rides: 1, bikeName: 'City Bike' });
    });

    test('accumulates distance and increments rides on subsequent rides', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member User' }, 3.5, 'City Bike');
        const second = await trackerModel.saveRideDistance({ id: 2, name: 'Member User' }, 2.5, 'City Bike');
        expect(second.distance).toBe(6);
        expect(second.rides).toBe(2);
    });

    test('defaults to Unknown Rider / Your City / Unknown Bike when not provided', async () => {
        const tracker = await trackerModel.saveRideDistance({ id: 2 }, 1);
        expect(tracker.userName).toBe('Unknown Rider');
        expect(tracker.city).toBe('Your City');
        expect(tracker.bikeName).toBe('Unknown Bike');
    });
});

describe('getTrackerByUser', () => {
    test('returns null for a user with no tracker entry', async () => {
        const tracker = await trackerModel.getTrackerByUser(2);
        expect(tracker).toBeNull();
    });

    test('returns the tracker entry once one exists', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member User' }, 5, 'City Bike');
        const tracker = await trackerModel.getTrackerByUser(2);
        expect(tracker.distance).toBe(5);
    });
});

describe('getAllTrackers', () => {
    test('returns entries sorted by distance, then rides, descending', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 5, 'Bike A');
        await trackerModel.saveRideDistance({ id: 3, name: 'Jason' }, 10, 'Bike B');
        const all = await trackerModel.getAllTrackers();
        expect(all[0].userId).toBe(3); // mock doesn't pre-sort; real query does ORDER BY distance DESC
    });
});
