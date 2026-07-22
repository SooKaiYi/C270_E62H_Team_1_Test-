jest.mock('../../backend/models/bikeModel', () => ({
  getAllBikes: jest.fn(), addBike: jest.fn(), getBikeById: jest.fn(),
  updateBike: jest.fn(), deleteBike: jest.fn(),
}));
const model = require('../../backend/models/bikeModel');
const controller = require('../../backend/controllers/bikeController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('bikeController', () => {
  beforeEach(() => jest.clearAllMocks());
  test('showBikes renders bikes', async () => {
    model.getAllBikes.mockResolvedValue([{ id: 1 }]);
    const req = createMockReq(); const res = createMockRes(); const next = jest.fn();
    await controller.showBikes(req, res, next);
    expect(res.render).toHaveBeenCalledWith('bikes/index', expect.objectContaining({ bikes: [{ id: 1 }] }));
  });
  test('showBikes forwards errors', async () => {
    const error = new Error('db'); model.getAllBikes.mockRejectedValue(error);
    const next = jest.fn(); await controller.showBikes(createMockReq(), createMockRes(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
  test('showAdminBikes renders admin page', async () => {
    model.getAllBikes.mockResolvedValue([]); const res = createMockRes();
    await controller.showAdminBikes(createMockReq(), res, jest.fn());
    expect(res.render).toHaveBeenCalledWith('bikes/admin', expect.objectContaining({ bikes: [] }));
  });
  test('showAddBike renders form', () => {
    const res = createMockRes(); controller.showAddBike(createMockReq(), res);
    expect(res.render).toHaveBeenCalledWith('bikes/add', expect.any(Object));
  });
  test('addBike saves and redirects', async () => {
    const req = createMockReq({ body: { name: 'Bike A' } }); const res = createMockRes();
    await controller.addBike(req, res, jest.fn());
    expect(model.addBike).toHaveBeenCalledWith(req.body); expect(res.redirect).toHaveBeenCalledWith('/bikes/admin');
  });
  test('showEditBike returns 404 when missing', async () => {
    model.getBikeById.mockResolvedValue(null); const res = createMockRes();
    await controller.showEditBike(createMockReq({ params: { id: '9' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404); expect(res.send).toHaveBeenCalledWith('Bike not found');
  });
  test('showEditBike renders found bike', async () => {
    model.getBikeById.mockResolvedValue({ id: 2 }); const res = createMockRes();
    await controller.showEditBike(createMockReq({ params: { id: '2' } }), res, jest.fn());
    expect(res.render).toHaveBeenCalledWith('bikes/edit', expect.objectContaining({ bike: { id: 2 } }));
  });
  test('updateBike updates and redirects', async () => {
    const req = createMockReq({ params: { id: '2' }, body: { status: 'Available' } }); const res = createMockRes();
    await controller.updateBike(req, res, jest.fn());
    expect(model.updateBike).toHaveBeenCalledWith('2', req.body); expect(res.redirect).toHaveBeenCalledWith('/bikes/admin');
  });
  test('deleteBike deletes and redirects', async () => {
    const res = createMockRes(); await controller.deleteBike(createMockReq({ params: { id: '2' } }), res, jest.fn());
    expect(model.deleteBike).toHaveBeenCalledWith('2'); expect(res.redirect).toHaveBeenCalledWith('/bikes/admin');
  });
});
