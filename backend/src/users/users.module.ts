// src/users/users.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';
import { UserController } from './user.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => UploadModule)],

  providers: [UsersService],
  controllers: [UserController],

  exports: [UsersService],
})
export class UsersModule {}
