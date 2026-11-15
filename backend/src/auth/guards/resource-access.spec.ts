import { PrismaService } from '../../database/prisma.service';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { hash } from 'argon2';
import { ContractsController } from '../../contracts/contracts.controller';
import { ContractsService } from '../../contracts/contracts.service';
import { InvoicesController } from '../../invoices/invoices.controller';
import { InvoicesService } from '../../invoices/invoices.service';
import { RoomsController } from '../../rooms/rooms.controller';
import { RoomsService } from '../../rooms/rooms.service';
import { UploadService } from '../../upload/upload.service';
import { UsersService } from '../../users/users.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { RefreshStrategy } from '../strategies/refresh.strategy';

type TokenPair = { access_token: string; refresh_token: string };

describe('Apartment resource access', () => {
  const secret = 'resource-access-test-only';
  const refreshSecret = 'refresh-test-only';
  const tenantA = '00000000-0000-4000-8000-000000000001';
  const tenantB = '00000000-0000-4000-8000-000000000002';
  const admin = '00000000-0000-4000-8000-000000000003';
  const recordA = {
    _id: '00000000-0000-4000-8000-000000000011',
    tenantId: tenantA,
  };
  const recordB = {
    _id: '00000000-0000-4000-8000-000000000012',
    tenantId: tenantB,
  };
  const records = [recordA, recordB];

  type Filter = { id: string; tenantId?: string };
  const room = { id: '00000000-0000-4000-8000-000000000099', amenities: [] };
  const lookup = (filter: Filter) => {
    const record = records.find(
      (record) =>
        record._id === filter.id &&
        (filter.tenantId === undefined || record.tenantId === filter.tenantId),
    );
    return record
      ? {
          ...record,
          id: record._id,
          status: 'pending',
          room,
          tenant: { id: record.tenantId },
          contractId: record._id,
          updatedAt: new Date('2026-01-01'),
        }
      : null;
  };
  const findFirst = jest.fn(async ({ where }: { where: Filter }) =>
    lookup(where),
  );
  const updateInvoice = jest.fn(async ({ where }: { where: Filter }) => ({
    count: lookup(where) ? 1 : 0,
  }));
  const uploadImage = jest.fn(async () => ({
    secure_url: 'https://example.invalid/slip.png',
    public_id: 'test-slip',
  }));
  const deleteImage = jest.fn(async () => undefined);
  const rooms = [
    { _id: '00000000-0000-4000-8000-000000000021', roomNumber: '101' },
  ];
  const jwt = new JwtService({ secret });
  const token = (sub: string, role = 'tenant') => jwt.sign({ sub, role });
  const credentials = {
    email: 'tenant@example.invalid',
    password: 'test-password',
  };
  const user = {
    _id: tenantA,
    email: credentials.email,
    role: 'tenant',
    passwordHash: '',
    refreshTokenHash: null as string | null,
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    user.passwordHash = await hash(credentials.password);
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET: secret,
              JWT_REFRESH_SECRET: refreshSecret,
            }),
          ],
        }),
      ],
      controllers: [
        AuthController,
        InvoicesController,
        ContractsController,
        RoomsController,
      ],
      providers: [
        AuthService,
        JwtService,
        JwtStrategy,
        RefreshStrategy,
        InvoicesService,
        ContractsService,
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              findFirst,
              findMany: async () =>
                records.map((record) => lookup({ id: record._id })),
              updateMany: updateInvoice,
            },
            contract: { findFirst },
            user: {
              findUnique: async () => ({ ...user, id: user._id }),
              updateMany: async ({
                where,
                data,
              }: {
                where: { id: string; refreshTokenHash?: string };
                data: { refreshTokenHash: string | null };
              }) => {
                if (
                  where.id !== user._id ||
                  (where.refreshTokenHash !== undefined &&
                    where.refreshTokenHash !== user.refreshTokenHash)
                )
                  return { count: 0 };
                user.refreshTokenHash = data.refreshTokenHash;
                return { count: 1 };
              },
            },
          },
        },
        {
          provide: RoomsService,
          useValue: { findAll: () => rooms, findOne: () => rooms[0] },
        },
        { provide: UploadService, useValue: { uploadImage, deleteImage } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('renews access to an invoice and rejects the refresh token after logout', async () => {
    const http = request(app.getHttpServer());
    const invoicePath = `/api/v1/invoices/${recordA._id}`;
    const refresh = (value: string) =>
      http.post('/api/v1/auth/refresh').auth(value, { type: 'bearer' });
    const response = await http
      .post('/api/v1/auth/signin')
      .send(credentials)
      .expect(201);
    const initial = response.body as TokenPair;
    const expired = jwt.sign(
      { sub: tenantA, role: 'tenant' },
      { expiresIn: -1 },
    );
    await http.get(invoicePath).auth(expired, { type: 'bearer' }).expect(401);

    const attempts = await Promise.all([
      refresh(initial.refresh_token),
      refresh(initial.refresh_token),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([
      201, 403,
    ]);
    const renewed = attempts.find((response) => response.status === 201)
      ?.body as TokenPair;
    expect(renewed.refresh_token).not.toBe(initial.refresh_token);
    await http
      .get(invoicePath)
      .auth(renewed.access_token, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => expect(body._id).toBe(recordA._id));
    await refresh(initial.refresh_token).expect(403);
    await http
      .post('/api/v1/auth/logout')
      .auth(renewed.access_token, { type: 'bearer' })
      .expect(201, { success: true });
    await refresh(renewed.refresh_token).expect(403);
  });

  it.each(['invoices', 'contracts'])(
    'scopes %s detail to its owner or an admin',
    async (resource) => {
      const path = `/api/v1/${resource}/${recordA._id}`;
      const http = request(app.getHttpServer());

      await http.get(path).expect(401);
      await http
        .get(path)
        .auth(token(tenantA), { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body._id).toBe(recordA._id));
      await http.get(path).auth(token(tenantB), { type: 'bearer' }).expect(404);
      await http
        .get(path)
        .auth(token(admin, 'admin'), { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body._id).toBe(recordA._id));
    },
  );

  it('only allows admins to list all invoices', async () => {
    const http = request(app.getHttpServer());

    await http
      .get('/api/v1/invoices')
      .auth(token(tenantA), { type: 'bearer' })
      .expect(403);
    await http
      .get('/api/v1/invoices')
      .auth(token(admin, 'admin'), { type: 'bearer' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.map((item: { _id: string }) => item._id)).toEqual(
          records.map((item) => item._id),
        ),
      );
  });

  it('checks invoice ownership before uploading and in the update filter', async () => {
    const submitSlip = (subject: string) =>
      request(app.getHttpServer())
        .patch(`/api/v1/invoices/${recordA._id}/pay`)
        .auth(token(subject), { type: 'bearer' })
        .field('paidAt', '2026-11-14')
        .attach('file', Buffer.from('test upload'), 'slip.png');

    await submitSlip(tenantB).expect(404);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();

    await submitSlip(tenantA)
      .expect(200)
      .expect(({ body }) => expect(body._id).toBe(recordA._id));
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(updateInvoice.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        id: recordA._id,
        tenantId: tenantA,
        status: 'pending',
      }),
    );
  });

  it.each(['/api/v1/rooms', `/api/v1/rooms/${rooms[0]._id}`])(
    'requires an admin to read %s',
    async (path) => {
      const http = request(app.getHttpServer());

      await http.get(path).expect(401);
      await http.get(path).auth(token(tenantA), { type: 'bearer' }).expect(403);
      await http
        .get(path)
        .auth(token(admin, 'admin'), { type: 'bearer' })
        .expect(200);
    },
  );

  it('rejects a token without a valid account ID', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/invoices/${recordA._id}`)
      .auth(jwt.sign({ role: 'tenant' }), { type: 'bearer' })
      .expect(401);
  });
});
