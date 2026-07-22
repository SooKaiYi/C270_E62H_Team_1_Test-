jest.mock('../../backend/config/database', () => ({ execute: jest.fn(), getConnection: jest.fn() }));
const pool = require('../../backend/config/database');
const rewards = require('../../backend/controllers/rewardsController');

describe('rewardsController/service', () => {
  beforeEach(() => jest.clearAllMocks());
  test.each([[0,0],[9.9,0],[10,1],[25.8,2],[60,15],[120,15]])('calculatePoints(%s) gives %s', (minutes, points) => { expect(rewards.calculatePoints(minutes).points).toBe(points); });
  test('getOrCreateUserRewards normalizes numeric values', async () => {
    pool.execute.mockResolvedValueOnce([{}]).mockResolvedValueOnce([[{ userId: 1, points: '10', freeHours: '2', rides: '3', totalMinutes: '40', friendsReferred: '1' }]]);
    const result = await rewards.getOrCreateUserRewards({ id: 1, name: 'Test' });
    expect(result).toEqual(expect.objectContaining({ points: 10, freeHours: 2, rides: 3, totalMinutes: 40, friendsReferred: 1 }));
  });
  test('addRidePoints skips rides under 10 minutes', async () => {
    const result = await rewards.addRidePoints({ id: 1, name: 'Test' }, 5);
    expect(result.success).toBe(false); expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test('redeem rejects invalid option without DB call', async () => {
    const result = await rewards.redeem({ id: 1, name: 'Test' }, 30);
    expect(result).toEqual({ success: false, message: 'Invalid reward option.' }); expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test('getUserTransactions normalizes values', async () => {
    pool.execute.mockResolvedValue([[{ id: 1, userId: '2', points: '5' }]]);
    await expect(rewards.getUserTransactions(2)).resolves.toEqual([{ id: 1, userId: 2, points: 5 }]);
  });
});
