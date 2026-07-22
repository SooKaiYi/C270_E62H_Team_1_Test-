jest.mock('../../backend/models/trackerModel', () => ({ getTrackerByUser: jest.fn(), saveRideDistance: jest.fn() }));
const model = require('../../backend/models/trackerModel');
const controller = require('../../backend/controllers/trackerController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('trackerController', () => {
  beforeEach(() => jest.clearAllMocks());
  test('requireLogin redirects guest', () => { const res = createMockRes(); const next = jest.fn(); controller.requireLogin({ session: {} }, res, next); expect(res.redirect).toHaveBeenCalledWith('/login.html'); expect(next).not.toHaveBeenCalled(); });
  test('showTracker renders tracker', async () => { model.getTrackerByUser.mockResolvedValue({ distance: 5 }); const res = createMockRes(); await controller.showTracker(createMockReq(), res, jest.fn()); expect(model.getTrackerByUser).toHaveBeenCalledWith(1); expect(res.render).toHaveBeenCalledWith('tracker', expect.objectContaining({ tracker: { distance: 5 } })); });
  test('saveDistance rejects unauthorized user', async () => { const res = createMockRes(); await controller.saveDistance({ session: null, body: {} }, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(401); });
  test('saveDistance rejects invalid distance', async () => { const res = createMockRes(); await controller.saveDistance(createMockReq({ body: { distance: '-1' } }), res, jest.fn()); expect(res.status).toHaveBeenCalledWith(400); });
  test('saveDistance saves valid distance', async () => { model.saveRideDistance.mockResolvedValue({ distance: 12.5 }); const res = createMockRes(); await controller.saveDistance(createMockReq({ body: { distance: '2.5', bikeName: 'Road Bike' } }), res, jest.fn()); expect(model.saveRideDistance).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 2.5, 'Road Bike'); expect(res.json).toHaveBeenCalledWith({ success: true, tracker: { distance: 12.5 }, distance: 12.5 }); });
  test('saveDistance forwards model error', async () => { const err = new Error('db'); model.saveRideDistance.mockRejectedValue(err); const next = jest.fn(); await controller.saveDistance(createMockReq({ body: { distance: '2' } }), createMockRes(), next); expect(next).toHaveBeenCalledWith(err); });
});
