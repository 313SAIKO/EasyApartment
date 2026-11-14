import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UploadService } from './upload.service';
import { UsersService } from '../users/users.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('upload')
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private usersService: UsersService,
  ) {}

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles('tenant')
  @UseGuards(AccessTokenGuard)
  @Post(':type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const allowedTypes = ['avatars', 'slips', 'maintenance'];

    if (!allowedTypes.includes(type)) {
      throw new BadRequestException('Invalid upload type');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.uploadService.uploadImage(file, type);

    return this.usersService.updateAvatar(
      req.user.sub,
      result.secure_url,
      result.public_id,
    );
  }
}
