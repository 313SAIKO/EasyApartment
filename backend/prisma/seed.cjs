require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (url.pathname !== '/easyapartment_dev')
    throw new Error('Seed requires easyapartment_dev');
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('Set SEED_PASSWORD with at least 12 characters');
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString() }),
  });
  try {
    const passwordHash = await argon2.hash(password);
    for (const [email, role, fullName] of [
      ['admin@example.test', 'admin', 'Demo Admin'],
      ['tenant1@example.test', 'tenant', 'Demo Tenant One'],
      ['tenant2@example.test', 'tenant', 'Demo Tenant Two'],
    ]) {
      await db.user.upsert({
        where: { email },
        update: {},
        create: { email, role, fullName, passwordHash },
      });
    }
    const tenant = await db.user.findUniqueOrThrow({
      where: { email: 'tenant1@example.test' },
    });
    await db.$transaction(async (tx) => {
      for (const [roomNumber, status] of [
        ['DEMO-101', 'occupied'],
        ['DEMO-102', 'available'],
      ]) {
        await tx.room.upsert({
          where: { roomNumber },
          update: {},
          create: {
            roomNumber,
            status,
            floor: 1,
            roomType: 'standard',
            prices: 3000,
            amenities: ['Air conditioning', 'WiFi'],
            waterMeter: roomNumber === 'DEMO-101' ? 10 : 0,
            electricMeter: roomNumber === 'DEMO-101' ? 100 : 0,
          },
        });
      }
      const room = await tx.room.findUniqueOrThrow({
        where: { roomNumber: 'DEMO-101' },
      });
      const contract = await tx.contract.upsert({
        where: { id: 'de000000-0000-4000-8000-000000000001' },
        update: {},
        create: {
          id: 'de000000-0000-4000-8000-000000000001',
          roomId: room.id,
          tenantId: tenant.id,
          type: 'monthly',
          status: 'active',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          deposit: 3000,
          advancePayment: 3000,
        },
      });
      await tx.invoice.upsert({
        where: {
          contractId_billingPeriod: {
            contractId: contract.id,
            billingPeriod: '2026-11',
          },
        },
        update: {},
        create: {
          contractId: contract.id,
          roomId: room.id,
          tenantId: tenant.id,
          billingPeriod: '2026-11',
          waterPrevious: 0,
          waterCurrent: 10,
          waterUnitPrice: 10,
          electricPrevious: 0,
          electricCurrent: 100,
          electricUnitPrice: 8,
          rent: 3000,
          serviceFee: 100,
          waterTotal: 100,
          electricTotal: 800,
          grandTotal: 4000,
        },
      });
      await tx.maintenance.upsert({
        where: { id: 'de000000-0000-4000-8000-000000000002' },
        update: {},
        create: {
          id: 'de000000-0000-4000-8000-000000000002',
          roomId: room.id,
          reportedById: tenant.id,
          title: 'Demo: leaking tap',
          description: 'Sample maintenance request for testing',
          priority: 'medium',
          repairLogs: [
            {
              status: 'pending',
              note: 'Demo request submitted',
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      });
    });
    console.log(
      'Demo accounts, two rooms, active contract, invoice and maintenance request ready',
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.name);
  process.exitCode = 1;
});
