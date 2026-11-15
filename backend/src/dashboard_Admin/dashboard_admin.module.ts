import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DashboardAdminController } from './dashboard_admin.controller';
import { DashboardAdminService } from './dashboard_admin.service';
@Module({
  imports: [DatabaseModule],
  controllers: [DashboardAdminController],
  providers: [DashboardAdminService],
})
export class DashboardAdminModule {}
