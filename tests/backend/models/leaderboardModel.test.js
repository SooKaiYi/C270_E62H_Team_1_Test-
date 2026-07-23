jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const trackerModel = require('../../../backend/models/trackerModel');
const leaderboardModel = require('../../../backend/models/leaderboardModel');

beforeEach(() => {
    db._reset();
});

describe('refreshLeaderboard', () => {
    test('builds the leaderboard from tracker data', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member User', city: 'Singapore' }, 5, 'City Bike');
        const board = await leaderboardModel.refreshLeaderboard();
        expect(board).toHaveLength(1);
        expect(board[0]).toMatchObject({ userId: 2, distance: 5, bikeName: 'City Bike' });
    });

    test('sorted by distance descending, then rides descending', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 5, 'Bike A');
        await trackerModel.saveRideDistance({ id: 3, name: 'Jason' }, 10, 'Bike B');
        const board = await leaderboardModel.refreshLeaderboard();
        expect(board[0].userId).toBe(3);
        expect(board[1].userId).toBe(2);
    });

    test('updates an existing leaderboard entry rather than duplicating it', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 5, 'Bike A');
        await leaderboardModel.refreshLeaderboard();
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 3, 'Bike A');
        const board = await leaderboardModel.refreshLeaderboard();
        expect(board).toHaveLength(1);
        expect(board[0].distance).toBe(8);
    });
});

describe('getLeaderboard', () => {
    test('returns the user in "friends" when they already have leaderboard data', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member User' }, 5, 'Bike A');
        const result = await leaderboardModel.getLeaderboard({ id: 2, name: 'Member User' });
        expect(result.friends).toHaveLength(1);
        expect(result.friends[0].userId).toBe(2);
    });

    test('falls back to a zeroed placeholder entry for a user with no ride history yet', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 5, 'Bike A');
        const result = await leaderboardModel.getLeaderboard({ id: 3, name: 'jason' });
        expect(result.friends).toHaveLength(1);
        expect(result.friends[0]).toMatchObject({
            userId: 3, userName: 'jason', distance: 0, rides: 0, bikeName: 'Unknown Bike',
        });
    });

    test('global leaderboard includes every rider, sorted by distance', async () => {
        await trackerModel.saveRideDistance({ id: 2, name: 'Member' }, 5, 'Bike A');
        await trackerModel.saveRideDistance({ id: 3, name: 'Jason' }, 10, 'Bike B');
        const result = await leaderboardModel.getLeaderboard({ id: 2, name: 'Member' });
        expect(result.global).toHaveLength(2);
        expect(result.global[0].userId).toBe(3);
    });
});
