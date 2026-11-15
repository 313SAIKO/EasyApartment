import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
@Module({
  imports: [DatabaseModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
