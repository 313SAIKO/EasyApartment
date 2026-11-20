import {
  Controller,
  Post,
  Patch,
  UseGuards,
  Body,
  Get,
  Req,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserByAdminDto } from './dto/user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UpdateAvatarDto } from './dto/avatar.url.dto';
import { ResetTenantPasswordDto } from './dto/reset-tenant-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
interface JwtRequest extends Request {
  user: JwtPayload;
}

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/profile')
  @Roles('tenant', 'admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  updateProfile(@Req() req: JwtRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  //=========> create Account by admin for tenant
  @Post('admin/create-user')
  @Roles('admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  createByAdmin(@Body() dto: CreateUserByAdminDto) {
    return this.usersService.createUserByAdmin(dto);
  }

  @Post('admin/reset-tenant-password')
  @Roles('admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  resetTenantPassword(@Body() dto: ResetTenantPasswordDto) {
    return this.usersService.resetTenantPassword(dto.email);
  }

  //=========> reset password
  @Patch('me/password')
  @Roles('tenant', 'admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  async changePassword(
    @Req() req: JwtRequest,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmNewpassword') confirmNewpassword: string,
  ) {
    return this.usersService.changePassword(
      req.user.sub,
      oldPassword,
      newPassword,
      confirmNewpassword,
    );
  }

  // ====================> แก้ไขรูป avatar
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant', 'admin')
  @Patch('me/avatar')
  updateMyAvatar(@Req() req: JwtRequest, @Body() dto: UpdateAvatarDto) {
    return this.usersService.updateAvatar(
      req.user.sub,
      dto.avatarUrl,
      dto.avatarPublicId,
    );
  }

  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}
