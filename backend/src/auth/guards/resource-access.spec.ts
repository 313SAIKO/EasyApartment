import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContractsController } from '../../contracts/contracts.controller';
import { ContractsService } from '../../contracts/contracts.service';
import { InvoicesController } from '../../invoices/invoices.controller';
import { InvoicesService } from '../../invoices/invoices.service';
import { RoomsController } from '../../rooms/rooms.controller';
import { RoomsService } from '../../rooms/rooms.service';
import { UploadService } from '../../upload/upload.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('Apartment resource access', () => {
  const secret = 'resource-access-test-only';
  const tenantA = '000000000000000000000001';
  const tenantB = '000000000000000000000002';
  const admin = '000000000000000000000003';
  const recordA = { _id: '000000000000000000000011', tenantId: tenantA };
  const recordB = { _id: '000000000000000000000012', tenantId: tenantB };
  const records = [recordA, recordB];

  type Filter = { _id: string; tenantId?: string };
  const lookup = (filter: Filter) =>
    records.find(
      (record) =>
        record._id === filter._id &&
        (filter.tenantId === undefined || record.tenantId === filter.tenantId),
    ) ?? null;

  const findOne = jest.fn((filter: Filter) => {
    const query = {
      populate: () => query,
      exec: async () => lookup(filter),
    };
    return query;
  });
  const updateInvoice = jest.fn((filter: Filter) => ({
    exec: async () => lookup(filter),
  }));
  const uploadImage = jest.fn(async () => ({
    secure_url: 'https://example.invalid/slip.png',
    public_id: 'test-slip',
  }));
  const deleteImage = jest.fn(async () => undefined);
  const rooms = [{ _id: '000000000000000000000021', roomNumber: '101' }];
  const jwt = new JwtService({ secret });
  const token = (sub: string, role = 'tenant') => jwt.sign({ sub, role });
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => ({ JWT_ACCESS_SECRET: secret })],
        }),
      ],
      controllers: [InvoicesController, ContractsController, RoomsController],
      providers: [
        JwtStrategy,
        InvoicesService,
        ContractsService,
        {
          provide: getModelToken('Invoice'),
          useValue: {
            findOne,
            find: () => ({ populate: () => ({ exec: async () => records }) }),
            exists: async (filter: Filter) => lookup(filter),
            findOneAndUpdate: updateInvoice,
          },
        },
        { provide: getModelToken('Contract'), useValue: { findOne } },
        { provide: getModelToken('Room'), useValue: {} },
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

  it.each(['invoices', 'contracts'])(
    'scopes %s detail to its owner or an admin',
    async (resource) => {
      const path = `/api/v1/${resource}/${recordA._id}`;
      const http = request(app.getHttpServer());

      await http.get(path).expect(401);
      await http
        .get(path)
        .auth(token(tenantA), { type: 'bearer' })
        .expect(200, recordA);
      await http.get(path).auth(token(tenantB), { type: 'bearer' }).expect(404);
      await http
        .get(path)
        .auth(token(admin, 'admin'), { type: 'bearer' })
        .expect(200, recordA);
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
      .expect(200, records);
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

    await submitSlip(tenantA).expect(200, recordA);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(updateInvoice.mock.calls[0][0]).toEqual({
      _id: recordA._id,
      tenantId: tenantA,
    });
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
