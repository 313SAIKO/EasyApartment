const { verifyApp } = require('../prisma/verify-app.cjs');

describe('PostgreSQL application workflows', () => {
  it('verifies persisted workflows, tenant isolation and sessions', async () => {
    await verifyApp();
  }, 120_000);
});
