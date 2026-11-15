require('dotenv').config({ quiet: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { AuthModule } = require('../dist/auth/auth.module');
const { PrismaService } = require('../dist/database/prisma.service');
const request = require('supertest');

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const db = app.get(PrismaService);
  const email = `auth-check-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  try {
    const http = request(app.getHttpServer());
    await http.post('/auth/createAccount').send({ email, password }).expect(201);
    const login = await http.post('/auth/signin').send({ email, password }).expect(201);
    assert(login.body.user.id);
    await http.get('/auth/profile').auth(login.body.access_token, { type: 'bearer' }).expect(200);
    const refreshed = await http.post('/auth/refresh').auth(login.body.refresh_token, { type: 'bearer' }).expect(201);
    await http.post('/auth/refresh').auth(login.body.refresh_token, { type: 'bearer' }).expect(403);
    await http.post('/auth/logout').auth(refreshed.body.access_token, { type: 'bearer' }).expect(201);
    await http.post('/auth/refresh').auth(refreshed.body.refresh_token, { type: 'bearer' }).expect(403);
    console.log('PostgreSQL auth verified: registration, login, profile, rotation, replay rejection, logout revocation');
  } finally {
    await db.user.deleteMany({ where: { email } });
    await app.close();
  }
}
main().catch(() => { console.error('Auth verification failed'); process.exitCode = 1; });
