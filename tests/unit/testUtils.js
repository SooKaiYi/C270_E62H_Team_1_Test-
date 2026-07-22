function createMockReq(overrides = {}) {
  return {
    session: { user: { id: 1, name: 'Test User', role: 'admin' } },
    body: {},
    params: {},
    ...overrides,
  };
}

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = { createMockReq, createMockRes };
