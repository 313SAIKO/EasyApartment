import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UploadModule } from '../upload/upload.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
@Module({
  imports: [DatabaseModule, UploadModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
