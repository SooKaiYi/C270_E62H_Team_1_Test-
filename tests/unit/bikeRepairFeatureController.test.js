jest.mock('../../backend/config/database', () => ({ execute: jest.fn() }));
const pool = require('../../backend/config/database');
const controller = require('../../backend/controllers/bikeRepairFeatureController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('bikeRepairFeatureController', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => console.error.mockRestore());
  test('showRepairPage renders form', () => {
    const res = createMockRes(); controller.showRepairPage(createMockReq(), res);
    expect(res.render).toHaveBeenCalledWith('bikeRepairReportPage', expect.any(Object));
  });
  test('submitRepairReport validates required fields', async () => {
    const res = createMockRes(); await controller.submitRepairReport(createMockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400); expect(pool.execute).not.toHaveBeenCalled();
  });
  test('submitRepairReport inserts and renders confirmation', async () => {
    pool.execute.mockResolvedValue([{ insertId: 7 }]);
    const req = createMockReq({ body: { bikeStation: '  A  ', bikeID: ' B1 ', issueType: ' Flat ', description: ' tyre ' } });
    const res = createMockRes(); await controller.submitRepairReport(req, res);
    expect(pool.execute).toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith('bikeRepairSubmittedPage', expect.objectContaining({ report: expect.objectContaining({ id: 7, bikeStation: 'A', bikeID: 'B1', issueType: 'Flat', description: 'tyre', status: 'Pending' }) }));
  });
  test('submitRepairReport handles database error', async () => {
    pool.execute.mockRejectedValue(new Error('db')); const res = createMockRes();
    await controller.submitRepairReport(createMockReq({ body: { bikeStation: 'A', bikeID: '1', issueType: 'Flat' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  test('showAdminPage rejects non-admin', async () => {
    const res = createMockRes(); await controller.showAdminPage(createMockReq({ session: { user: { role: 'member' } } }), res);
    expect(res.status).toHaveBeenCalledWith(403); expect(pool.execute).not.toHaveBeenCalled();
  });
  test('showAdminPage renders reports for admin', async () => {
    pool.execute.mockResolvedValue([[{ id: 1 }]]); const res = createMockRes();
    await controller.showAdminPage(createMockReq(), res);
    expect(res.render).toHaveBeenCalledWith('bikeRepairAdminPage', expect.objectContaining({ reports: [{ id: 1 }] }));
  });
  test('updateRepairStatus rejects invalid status', async () => {
    const res = createMockRes(); await controller.updateRepairStatus(createMockReq({ params: { id: '1' }, body: { status: 'Done' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('updateRepairStatus returns 404 when report missing', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 0 }]); const res = createMockRes();
    await controller.updateRepairStatus(createMockReq({ params: { id: '1' }, body: { status: 'Resolved' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  test('updateRepairStatus updates and redirects', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]); const res = createMockRes();
    await controller.updateRepairStatus(createMockReq({ params: { id: '1' }, body: { status: 'Resolved' } }), res);
    expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['Resolved', '1']); expect(res.redirect).toHaveBeenCalledWith('/repair/admin');
  });
});
