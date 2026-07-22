jest.mock('../../backend/models/rentalModel', () => ({ getUserRentals: jest.fn(), getAllRentals: jest.fn(), rentBike: jest.fn(), returnBike: jest.fn(), updateRental: jest.fn(), deleteRental: jest.fn() }));
const model = require('../../backend/models/rentalModel');
const controller = require('../../backend/controllers/rentalController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('rentalController', () => {
  beforeEach(() => jest.clearAllMocks());
  test('showMyRentals renders user rentals', async () => { model.getUserRentals.mockResolvedValue([{ id: 1 }]); const res = createMockRes(); await controller.showMyRentals(createMockReq(), res, jest.fn()); expect(model.getUserRentals).toHaveBeenCalledWith(1); expect(res.render).toHaveBeenCalledWith('rentals/index', expect.objectContaining({ rentals: [{ id: 1 }] })); });
  test('showAdminRentals renders all rentals', async () => { model.getAllRentals.mockResolvedValue([]); const res = createMockRes(); await controller.showAdminRentals(createMockReq(), res, jest.fn()); expect(res.render).toHaveBeenCalledWith('rentals/admin', expect.objectContaining({ rentals: [] })); });
  test('rentBike passes user and bike details', async () => { const req = createMockReq({ params: { id: '5' } }); const res = createMockRes(); await controller.rentBike(req, res, jest.fn()); expect(model.rentBike).toHaveBeenCalledWith({ userId: 1, userName: 'Test User', bikeId: '5' }); expect(res.redirect).toHaveBeenCalledWith('/rentals'); });
  test('rentBike renders insufficient balance page', async () => { const err = Object.assign(new Error(), { name: 'InsufficientBalanceError', balance: 1, required: 5 }); model.rentBike.mockRejectedValue(err); const res = createMockRes(); await controller.rentBike(createMockReq({ params: { id: '5' } }), res, jest.fn()); expect(res.render).toHaveBeenCalledWith('wallet/insufficient-balance', expect.objectContaining({ balance: 1, required: 5 })); });
  test('rentBike forwards other errors', async () => { const err = new Error('db'); model.rentBike.mockRejectedValue(err); const next = jest.fn(); await controller.rentBike(createMockReq({ params: { id: '5' } }), createMockRes(), next); expect(next).toHaveBeenCalledWith(err); });
  test('returnBike returns and redirects', async () => { const res = createMockRes(); await controller.returnBike(createMockReq({ params: { id: '3' } }), res, jest.fn()); expect(model.returnBike).toHaveBeenCalledWith('3'); expect(res.redirect).toHaveBeenCalledWith('/rentals'); });
  test('updateRental updates and redirects', async () => { const req = createMockReq({ params: { id: '3' }, body: { status: 'Returned' } }); const res = createMockRes(); await controller.updateRental(req, res, jest.fn()); expect(model.updateRental).toHaveBeenCalledWith('3', req.body); expect(res.redirect).toHaveBeenCalledWith('/rentals/admin'); });
  test('deleteRental deletes and redirects', async () => { const res = createMockRes(); await controller.deleteRental(createMockReq({ params: { id: '3' } }), res, jest.fn()); expect(model.deleteRental).toHaveBeenCalledWith('3'); expect(res.redirect).toHaveBeenCalledWith('/rentals/admin'); });
});
