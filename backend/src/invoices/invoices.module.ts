import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UploadModule } from '../upload/upload.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
@Module({
  imports: [DatabaseModule, UploadModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
