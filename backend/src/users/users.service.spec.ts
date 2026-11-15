import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: {} },
        { provide: UploadService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
