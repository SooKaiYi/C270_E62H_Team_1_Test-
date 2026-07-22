jest.mock('../../backend/config/database', () => ({ execute: jest.fn() }));
const pool = require('../../backend/config/database');
const controller = require('../../backend/controllers/mapController');
const { createMockReq, createMockRes } = require('./testUtils');

describe('mapController', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => console.error.mockRestore());
  test('showMap renders stations', async () => { pool.execute.mockResolvedValue([[{ id: 1, name: 'Station' }]]); const res = createMockRes(); await controller.showMap(createMockReq(), res); expect(res.render).toHaveBeenCalledWith('index', { bikeStations: [{ id: 1, name: 'Station' }] }); });
  test('showMap returns 500 on error', async () => { pool.execute.mockRejectedValue(new Error('db')); const res = createMockRes(); await controller.showMap(createMockReq(), res); expect(res.status).toHaveBeenCalledWith(500); expect(res.send).toHaveBeenCalledWith('Unable to load the map.'); });
});
