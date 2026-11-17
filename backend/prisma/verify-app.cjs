require('dotenv').config({ quiet: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { ThrottlerGuard } = require('@nestjs/throttler');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/database/prisma.service');
const { UploadService } = require('../dist/upload/upload.service');
const request = require('supertest');

async function main() {
  if (new URL(process.env.DATABASE_URL).pathname !== '/easyapartment_dev') {
    throw new Error('Integration verification requires easyapartment_dev');
  }
  let uploaded = 0;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(UploadService)
    .useValue({
      uploadImage: async () => ({
        secure_url: 'https://example.invalid/test.png',
        public_id: `test-${++uploaded}`,
      }),
      deleteImage: async () => undefined,
    })
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  const db = app.get(PrismaService);
  const suffix = randomUUID();
  const emails = ['admin', 'tenant-a', 'tenant-b'].map(
    (role) => `${role}-${suffix}@example.invalid`,
  );
  const password = randomUUID();
  const roomNumber = `verify-${suffix}`;
  const http = request(app.getHttpServer());
  const api = '/api/v1';
  const auth = (call, token) => call.auth(token, { type: 'bearer' });
  try {
    for (const email of emails)
      await http
        .post(`${api}/auth/createAccount`)
        .send({ email, password })
        .expect(201);
    await db.user.update({
      where: { email: emails[0] },
      data: { role: 'admin' },
    });
    const users = await Promise.all(
      emails.map((email) => db.user.findUniqueOrThrow({ where: { email } })),
    );
    const logins = [];
    for (const email of emails)
      logins.push(
        (
          await http
            .post(`${api}/auth/signin`)
            .send({ email, password })
            .expect(201)
        ).body,
      );
    let [admin, tenantA, tenantB] = logins.map((login) => login.access_token);
    const managedEmail = `managed-${suffix}@example.invalid`;
    emails.push(managedEmail);
    const managedDto = {
      email: managedEmail,
      role: 'tenant',
      profile: {
        fullName: 'Integration Managed Tenant',
        phone: '0000000000',
        idCardNumber: 'TEST-ONLY',
      },
    };
    await auth(http.post(`${api}/users/admin/create-user`), tenantA)
      .send(managedDto)
      .expect(403);
    const managed = await auth(
      http.post(`${api}/users/admin/create-user`),
      admin,
    )
      .send(managedDto)
      .expect(201);
    assert(managed.body.temporaryPassword.length >= 12);
    assert.equal(managed.body.user.passwordHash, undefined);
    await http
      .post(`${api}/auth/signin`)
      .send({ email: managedEmail, password: managed.body.temporaryPassword })
      .expect(201);
    const newPassword = randomUUID();
    await auth(http.patch(`${api}/users/me/password`), tenantB)
      .send({
        oldPassword: password,
        newPassword,
        confirmNewpassword: newPassword,
      })
      .expect(200);
    await http
      .post(`${api}/auth/signin`)
      .send({ email: emails[2], password })
      .expect(401);
    await auth(
      http.post(`${api}/auth/refresh`),
      logins[2].refresh_token,
    ).expect(403);
    await auth(http.get(`${api}/auth/profile`), tenantB).expect(401);
    tenantB = (
      await http
        .post(`${api}/auth/signin`)
        .send({ email: emails[2], password: newPassword })
        .expect(201)
    ).body.access_token;
    const managedLogin = (
      await http
        .post(`${api}/auth/signin`)
        .send({ email: managedEmail, password: managed.body.temporaryPassword })
        .expect(201)
    ).body;
    await http
      .post(`${api}/users/admin/reset-tenant-password`)
      .send({ email: managedEmail })
      .expect(401);
    await auth(http.post(`${api}/users/admin/reset-tenant-password`), tenantA)
      .send({ email: managedEmail })
      .expect(403);
    await auth(http.post(`${api}/users/admin/reset-tenant-password`), admin)
      .send({ email: emails[0] })
      .expect(404);
    const reset = await auth(
      http.post(`${api}/users/admin/reset-tenant-password`),
      admin,
    )
      .send({ email: managedEmail })
      .expect(201);
    await auth(
      http.get(`${api}/auth/profile`),
      managedLogin.access_token,
    ).expect(401);
    await auth(
      http.post(`${api}/auth/refresh`),
      managedLogin.refresh_token,
    ).expect(403);
    await http
      .post(`${api}/auth/signin`)
      .send({ email: managedEmail, password: managed.body.temporaryPassword })
      .expect(401);
    const resetLogin = (
      await http
        .post(`${api}/auth/signin`)
        .send({ email: managedEmail, password: reset.body.temporaryPassword })
        .expect(201)
    ).body;
    await auth(http.get(`${api}/auth/profile`), resetLogin.access_token).expect(
      200,
    );
    await auth(http.get(`${api}/rooms`), tenantA).expect(403);
    await http.get(`${api}/rooms`).expect(401);
    const room = (
      await auth(http.post(`${api}/rooms`), admin)
        .send({
          roomNumber,
          floor: 1,
          roomType: 'standard',
          prices: 3000,
          amenities: ['WiFi'],
        })
        .expect(201)
    ).body;
    const bulkDto = {
      floor: 1,
      roomType: 'standard',
      prices: 2500,
      amenities: [],
    };
    await auth(http.post(`${api}/rooms/bulk`), admin)
      .send([
        { ...bulkDto, roomNumber: `${roomNumber}-bulk-a` },
        { ...bulkDto, roomNumber },
      ])
      .expect(409);
    assert.equal(
      await db.room.count({ where: { roomNumber: `${roomNumber}-bulk-a` } }),
      0,
    );
    await auth(http.post(`${api}/rooms/bulk`), admin)
      .send([
        { ...bulkDto, roomNumber: `${roomNumber}-bulk-a` },
        { ...bulkDto, roomNumber: `${roomNumber}-bulk-b`, prices: -1 },
      ])
      .expect(400);
    assert.equal(
      await db.room.count({ where: { roomNumber: `${roomNumber}-bulk-a` } }),
      0,
    );
    const bulk = await auth(http.post(`${api}/rooms/bulk`), admin)
      .send([
        { ...bulkDto, roomNumber: `${roomNumber}-bulk-a` },
        { ...bulkDto, roomNumber: `${roomNumber}-bulk-b` },
      ])
      .expect(201);
    assert.equal(bulk.body.count, 2);
    await auth(http.patch(`${api}/rooms/${room._id}/status`), admin)
      .send({ status: 'occupied' })
      .expect(409);
    await auth(http.patch(`${api}/rooms/${room._id}/status`), admin)
      .send({ status: 'cleaning' })
      .expect(200);
    await auth(http.patch(`${api}/rooms/${room._id}/status`), admin)
      .send({ status: 'available' })
      .expect(200);
    const contractDto = {
      roomId: room._id,
      tenantId: users[1].id,
      type: 'monthly',
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      financials: { deposit: 3000, advancePayment: 3000 },
    };
    const contract = (
      await auth(http.post(`${api}/contracts`), admin)
        .send(contractDto)
        .expect(201)
    ).body;
    await auth(http.post(`${api}/contracts`), admin)
      .send({ ...contractDto, tenantId: users[2].id })
      .expect(409);
    await auth(http.get(`${api}/contracts/${contract._id}`), tenantA).expect(
      200,
    );
    await auth(http.get(`${api}/contracts/${contract._id}`), tenantB).expect(
      404,
    );
    await auth(http.get(`${api}/contracts/me`), tenantA).expect(200);
    await auth(http.patch(`${api}/rooms/${room._id}/status`), admin)
      .send({ status: 'available' })
      .expect(409);
    await auth(http.patch(`${api}/rooms/${room._id}/status`), tenantA)
      .send({ status: 'occupied' })
      .expect(403);
    assert.equal(
      (await db.room.findUniqueOrThrow({ where: { id: room._id } })).status,
      'occupied',
    );
    const invoiceDto = {
      contractId: contract._id,
      billingPeriod: '2026-11',
      meters: { water: { current: 10 }, electric: { current: 100 } },
      amounts: { rent: 3000, serviceFee: 100 },
    };
    const invoice = (
      await auth(http.post(`${api}/invoices`), admin)
        .send(invoiceDto)
        .expect(201)
    ).body;
    assert.equal(invoice.amounts.grandTotal, 4000);
    assert.equal(invoice.roomId.lastMeterReading.water, 10);
    await auth(http.patch(`${api}/contracts/${contract._id}`), admin)
      .send({ tenantId: users[2].id })
      .expect(409);
    await auth(http.post(`${api}/invoices`), admin)
      .send({
        ...invoiceDto,
        meters: { water: { current: 20 }, electric: { current: 200 } },
      })
      .expect(409);
    assert.equal(
      Number(
        (await db.room.findUniqueOrThrow({ where: { id: room._id } }))
          .waterMeter,
      ),
      10,
    );
    await auth(http.get(`${api}/invoices/${invoice._id}`), tenantB).expect(404);
    await auth(http.get(`${api}/invoices`), tenantA).expect(403);
    const own = await auth(http.get(`${api}/invoices/my`), tenantA).expect(200);
    assert(own.body.some((item) => item._id === invoice._id));
    const pay = (token) =>
      auth(http.patch(`${api}/invoices/${invoice._id}/pay`), token)
        .field('paidAt', '2026-11-15')
        .attach('file', Buffer.from('test-only'), 'slip.png');
    await pay(tenantB).expect(404);
    assert.equal(uploaded, 0);
    await pay(tenantA).expect(200);
    await pay(tenantA).expect(409);
    await auth(http.patch(`${api}/invoices/${invoice._id}/confirm`), tenantA)
      .send({ status: 'paid' })
      .expect(403);
    await auth(http.patch(`${api}/invoices/${invoice._id}/confirm`), admin)
      .send({ status: 'paid' })
      .expect(200);
    await auth(
      http.patch(`${api}/invoices/${invoice._id}/delete`),
      admin,
    ).expect(409);
    const next = (
      await auth(http.post(`${api}/invoices`), admin)
        .send({
          ...invoiceDto,
          billingPeriod: '2026-12',
          meters: { water: { current: 15 }, electric: { current: 120 } },
        })
        .expect(201)
    ).body;
    await auth(http.patch(`${api}/invoices/${next._id}/delete`), admin).expect(
      200,
    );
    assert.equal(
      Number(
        (await db.room.findUniqueOrThrow({ where: { id: room._id } }))
          .waterMeter,
      ),
      10,
    );
    await auth(http.post(`${api}/maintenance`), tenantB)
      .send({ title: 'Test', description: 'No contract' })
      .expect(400);
    const job = (
      await auth(http.post(`${api}/maintenance`), tenantA)
        .send({
          title: 'Leaking tap',
          description: 'Integration fixture',
          priority: 'medium',
        })
        .expect(201)
    ).body;
    assert.equal(job.roomId._id, room._id);
    await auth(http.get(`${api}/maintenance`), tenantA).expect(403);
    await auth(http.patch(`${api}/maintenance/${job._id}/repair-log`), admin)
      .send({ note: 'Fixed tap', status: 'completed' })
      .expect(200);
    const savedJob = await db.maintenance.findUniqueOrThrow({
      where: { id: job._id },
    });
    assert.equal(savedJob.repairLogs.length, 2);
    assert(savedJob.completedAt);
    await auth(http.get(`${api}/dashboard-admin/summary`), tenantA).expect(403);
    const dashboard = await auth(
      http.get(`${api}/dashboard-admin/summary`),
      admin,
    ).expect(200);
    assert.equal(dashboard.body.revenueChart.length, 12);
    await http.get(`${api}/dashboard-admin/reports?period=2026-11`).expect(401);
    await auth(
      http.get(`${api}/dashboard-admin/reports?period=2026-11`),
      tenantA,
    ).expect(403);
    await auth(
      http.get(`${api}/dashboard-admin/reports?period=2026-13`),
      admin,
    ).expect(400);
    const report = (
      await auth(
        http.get(`${api}/dashboard-admin/reports?period=2026-11`),
        admin,
      ).expect(200)
    ).body;
    assert(
      report.invoices.some(
        (item) =>
          item.id === invoice._id &&
          item.status === 'paid' &&
          item.amount === 4000,
      ),
    );
    assert.equal(
      report.summary.totalBilled,
      report.invoices.reduce((sum, item) => sum + item.amount, 0),
    );
    assert.equal(
      report.summary.collected,
      report.invoices
        .filter((item) => item.status === 'paid')
        .reduce((sum, item) => sum + item.amount, 0),
    );
    assert.equal(
      report.summary.outstanding,
      report.summary.totalBilled - report.summary.collected,
    );
    const avatar = await auth(
      http.post(`${api}/upload/avatars`),
      resetLogin.access_token,
    )
      .attach('file', Buffer.from('avatar-fixture'), 'avatar.png')
      .expect(201);
    assert(avatar.body.avatar.url);
    await http.delete(`${api}/upload/avatars`).expect(401);
    const removed = await auth(
      http.delete(`${api}/upload/avatars`),
      resetLogin.access_token,
    ).expect(200);
    assert.equal(removed.body.avatar.url, null);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { email: managedEmail } }))
        .avatarPublicId,
      null,
    );
    await auth(
      http.delete(`${api}/upload/avatars`),
      resetLogin.access_token,
    ).expect(200);
    // The guard must use the current database role even if the token still says admin.
    await db.user.update({
      where: { id: users[0].id },
      data: { role: 'tenant' },
    });
    await auth(http.get(`${api}/rooms`), admin).expect(403);
    await db.user.update({
      where: { id: users[0].id },
      data: { role: 'admin' },
    });
    await auth(http.delete(`${api}/maintenance/${job._id}`), admin).expect(200);
    const refresh = (value) => auth(http.post(`${api}/auth/refresh`), value);
    const attempts = await Promise.all([
      refresh(logins[1].refresh_token),
      refresh(logins[1].refresh_token),
    ]);
    assert.deepEqual(
      attempts.map((result) => result.status).sort(),
      [201, 403],
    );
    const renewed = attempts.find((result) => result.status === 201).body;
    await auth(http.get(`${api}/auth/profile`), renewed.access_token).expect(
      200,
    );
    await auth(http.post(`${api}/auth/logout`), renewed.access_token).expect(
      201,
    );
    await refresh(renewed.refresh_token).expect(403);
    await auth(http.get(`${api}/auth/profile`), renewed.access_token).expect(
      401,
    );
    await auth(http.delete(`${api}/contracts/${contract._id}`), admin).expect(
      200,
    );
    assert.equal(
      (await db.room.findUniqueOrThrow({ where: { id: room._id } })).status,
      'available',
    );
    console.log(
      'PASS PostgreSQL app: auth/session, rooms, contracts, invoices, meter rollback, maintenance, dashboard, ownership and roles. Cloudinary is mocked.',
    );
  } finally {
    const fixtures = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = fixtures.map((user) => user.id);
    await db.maintenance.deleteMany({ where: { reportedById: { in: ids } } });
    await db.invoice.deleteMany({ where: { tenantId: { in: ids } } });
    await db.contract.deleteMany({ where: { tenantId: { in: ids } } });
    await db.room.deleteMany({
      where: {
        roomNumber: {
          in: [roomNumber, `${roomNumber}-bulk-a`, `${roomNumber}-bulk-b`],
        },
      },
    });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  }
}
module.exports = { verifyApp: main };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
