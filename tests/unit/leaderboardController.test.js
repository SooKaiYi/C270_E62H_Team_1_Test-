jest.mock('../../backend/models/leaderboardModel', () => ({ getLeaderboard: jest.fn() }));
const model = require('../../backend/models/leaderboardModel');
const controller = require('../../backend/controllers/leaderboardController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('leaderboardController', () => {
  beforeEach(() => jest.clearAllMocks());
  test('requireLogin redirects guest', () => { const res = createMockRes(); const next = jest.fn(); controller.requireLogin({ session: {} }, res, next); expect(res.redirect).toHaveBeenCalledWith('/login.html'); expect(next).not.toHaveBeenCalled(); });
  test('requireLogin calls next for user', () => { const next = jest.fn(); controller.requireLogin(createMockReq(), createMockRes(), next); expect(next).toHaveBeenCalled(); });
  test('showLeaderboard renders results', async () => { model.getLeaderboard.mockResolvedValue([{ rank: 1 }]); const res = createMockRes(); await controller.showLeaderboard(createMockReq(), res, jest.fn()); expect(res.render).toHaveBeenCalledWith('leaderboard', expect.objectContaining({ leaderboard: [{ rank: 1 }] })); });
  test('showLeaderboard forwards errors', async () => { const err = new Error('db'); model.getLeaderboard.mockRejectedValue(err); const next = jest.fn(); await controller.showLeaderboard(createMockReq(), createMockRes(), next); expect(next).toHaveBeenCalledWith(err); });
});
