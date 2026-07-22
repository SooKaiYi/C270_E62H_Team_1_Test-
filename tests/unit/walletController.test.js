jest.mock('../../backend/models/walletModel', () => ({
  PASS_PRICES: { day_pass: { label: 'Day Pass', price: 10 } },
  getWalletDashboard: jest.fn(), topUpWallet: jest.fn(), purchasePass: jest.fn(), getTransactionHistory: jest.fn(),
}));
jest.mock('../../backend/models/adminWalletModel', () => ({ getAdminWalletDashboard: jest.fn() }));
const walletModel = require('../../backend/models/walletModel');
const adminModel = require('../../backend/models/adminWalletModel');
const controller = require('../../backend/controllers/walletController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('walletController', () => {
  beforeEach(() => jest.clearAllMocks());
  test('showDashboard renders dashboard', async () => { walletModel.getWalletDashboard.mockResolvedValue({ wallet: { balance: 10 }, transactions: [] }); const res = createMockRes(); await controller.showDashboard(createMockReq(), res, jest.fn()); expect(walletModel.getWalletDashboard).toHaveBeenCalledWith(1); expect(res.render).toHaveBeenCalledWith('wallet/index', expect.objectContaining({ wallet: { balance: 10 }, transactions: [] })); });
  test('showTopUp renders top-up page', () => { const res = createMockRes(); controller.showTopUp(createMockReq(), res); expect(res.render).toHaveBeenCalledWith('wallet/topup', expect.any(Object)); });
  test('topUp sets success message and redirects', async () => { const req = createMockReq({ body: { amount: '20' } }); const res = createMockRes(); await controller.topUp(req, res); expect(walletModel.topUpWallet).toHaveBeenCalledWith(1, '20'); expect(req.session.successMessage).toBe('Credits added successfully.'); expect(res.redirect).toHaveBeenCalledWith('/wallet'); });
  test('topUp stores error message', async () => { walletModel.topUpWallet.mockRejectedValue(new Error('Invalid amount')); const req = createMockReq({ body: { amount: '0' } }); const res = createMockRes(); await controller.topUp(req, res); expect(req.session.errorMessage).toBe('Invalid amount'); expect(res.redirect).toHaveBeenCalledWith('/wallet/topup'); });
  test('showPasses renders pass options', () => { const res = createMockRes(); controller.showPasses(createMockReq(), res); expect(res.render).toHaveBeenCalledWith('wallet/pass', expect.objectContaining({ passes: walletModel.PASS_PRICES })); });
  test('purchasePass sets success message', async () => { walletModel.purchasePass.mockResolvedValue({ pass: { label: 'Day Pass' } }); const req = createMockReq({ body: { passType: 'day_pass' } }); const res = createMockRes(); await controller.purchasePass(req, res); expect(req.session.successMessage).toBe('Day Pass purchased successfully.'); expect(res.redirect).toHaveBeenCalledWith('/wallet'); });
  test('showHistory renders transactions', async () => { walletModel.getTransactionHistory.mockResolvedValue([{ id: 1 }]); const res = createMockRes(); await controller.showHistory(createMockReq(), res, jest.fn()); expect(res.render).toHaveBeenCalledWith('wallet/history', expect.objectContaining({ transactions: [{ id: 1 }] })); });
  test('showAdminDashboard renders admin data', async () => { adminModel.getAdminWalletDashboard.mockResolvedValue({ wallets: [], transactions: [], statistics: { total: 0 } }); const res = createMockRes(); await controller.showAdminDashboard(createMockReq(), res, jest.fn()); expect(res.render).toHaveBeenCalledWith('wallet/admin', expect.objectContaining({ statistics: { total: 0 } })); });
});
