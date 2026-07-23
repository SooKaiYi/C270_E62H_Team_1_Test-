jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const repairController = require('../../../backend/controllers/bikeRepairFeatureController');

beforeEach(() => {
  db._reset();
});

function mockRes() {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    res.body = body;
    return res;
  };
  res.render = (view, data) => {
    res.view = view;
    res.data = data;
    return res;
  };
  res.redirect = (url) => {
    res.redirectedTo = url;
    return res;
  };
  return res;
}

describe('submitRepairReport', () => {
  test('rejects a request missing required fields', async () => {
    const req = { body: { bikeStation: '', bikeID: '', issueType: '' } };
    const res = mockRes();
    await repairController.submitRepairReport(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('successfully creates a report with status Pending', async () => {
    const req = {
      body: {
        bikeStation: 'Station A',
        bikeID: 'B123',
        issueType: 'Flat Tire',
        description: 'Rear tire flat',
      },
      session: {},
    };
    const res = mockRes();
    await repairController.submitRepairReport(req, res);
    expect(res.view).toBe('bikeRepairSubmittedPage');
    expect(res.data.report).toMatchObject({
      bikeStation: 'Station A',
      bikeID: 'B123',
      issueType: 'Flat Tire',
      status: 'Pending',
    });
  });

  test('trims whitespace from all text fields', async () => {
    const req = {
      body: {
        bikeStation: '  Station A  ',
        bikeID: ' B123 ',
        issueType: ' Flat Tire ',
        description: '  ',
      },
      session: {},
    };
    const res = mockRes();
    await repairController.submitRepairReport(req, res);
    expect(res.data.report.bikeStation).toBe('Station A');
    expect(res.data.report.description).toBe('');
  });
});

describe('showAdminPage', () => {
  test('rejects non-admin users with 403', async () => {
    const req = { session: { user: { role: 'Member' } } };
    const res = mockRes();
    await repairController.showAdminPage(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('rejects when there is no session user at all', async () => {
    const req = { session: {} };
    const res = mockRes();
    await repairController.showAdminPage(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('shows all reports to an admin, newest first', async () => {
    await repairController.submitRepairReport(
      {
        body: { bikeStation: 'A', bikeID: '1', issueType: 'Flat' },
        session: {},
      },
      mockRes()
    );
    await repairController.submitRepairReport(
      {
        body: { bikeStation: 'B', bikeID: '2', issueType: 'Brake' },
        session: {},
      },
      mockRes()
    );

    const req = { session: { user: { role: 'Admin' } } };
    const res = mockRes();
    await repairController.showAdminPage(req, res);

    expect(res.data.reports).toHaveLength(2);
    expect(res.data.reports[0].bikeStation).toBe('B'); // newest first
  });
});

describe('updateRepairStatus', () => {
  test('rejects an invalid status value', async () => {
    const req = {
      params: { id: 1 },
      body: { status: 'Deleted' },
      session: { user: { role: 'Admin' } },
    };
    const res = mockRes();
    await repairController.updateRepairStatus(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('rejects non-admin users', async () => {
    const req = {
      params: { id: 1 },
      body: { status: 'Resolved' },
      session: { user: { role: 'Member' } },
    };
    const res = mockRes();
    await repairController.updateRepairStatus(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('returns 404 for a report that does not exist', async () => {
    const req = {
      params: { id: 999 },
      body: { status: 'Resolved' },
      session: { user: { role: 'Admin' } },
    };
    const res = mockRes();
    await repairController.updateRepairStatus(req, res);
    expect(res.statusCode).toBe(404);
  });

  test('successfully updates the status and redirects', async () => {
    await repairController.submitRepairReport(
      {
        body: { bikeStation: 'A', bikeID: '1', issueType: 'Flat' },
        session: {},
      },
      mockRes()
    );

    const req = {
      params: { id: 1 },
      body: { status: 'Resolved' },
      session: { user: { role: 'Admin' } },
    };
    const res = mockRes();
    await repairController.updateRepairStatus(req, res);

    expect(res.redirectedTo).toBe('/repair/admin');

    const checkRes = mockRes();
    await repairController.showAdminPage(
      { session: { user: { role: 'Admin' } } },
      checkRes
    );
    expect(checkRes.data.reports[0].status).toBe('Resolved');
  });
});
