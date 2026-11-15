// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaExceptionFilter } from './database/prisma-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { RoomsModule } from './rooms/rooms.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ContractsModule } from './contracts/contracts.module';

// 1. เพิ่มบรรทัด Import ตรงนี้ (เช็คชื่อโฟลเดอร์ให้ตรงกับของเพื่อนนะ dashboard_Admin หรือ dashboard_admin)
import { DashboardAdminModule } from './dashboard_Admin/dashboard_admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 10,
        },
      ],
    }),

    UsersModule,
    AuthModule,
    UploadModule,
    RoomsModule,
    MaintenanceModule,
    InvoicesModule,
    ContractsModule,

    // 2. เพิ่มชื่อ Module เข้าไปในอาร์เรย์ imports ตรงนี้ ✅
    DashboardAdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ThrottlerGuard,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
