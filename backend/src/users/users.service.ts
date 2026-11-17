import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateUserByAdminDto } from './dto/user.dto';

function publicUser(user: User) {
  return {
    _id: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    profile: {
      fullName: user.fullName,
      phone: user.phone,
      idCardNumber: user.idCardNumber,
      birthDate: user.birthDate,
      avatar: { url: user.avatarUrl, publicId: user.avatarPublicId },
    },
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly db: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findByEmail(email: string) {
    const user = await this.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return user ? publicUser(user) : null;
  }

  async findByEmailWithSecrets(email: string) {
    const user = await this.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return user
      ? { ...publicUser(user), passwordHash: user.passwordHash }
      : null;
  }

  async findByIdWithRefresh(id: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    return user
      ? { ...publicUser(user), refreshTokenHash: user.refreshTokenHash }
      : null;
  }

  async create(data: { email: string; passwordHash: string; role?: UserRole }) {
    return this.insert({ ...data, email: data.email.trim().toLowerCase() });
  }

  private async insert(data: Prisma.UserCreateInput) {
    try {
      return publicUser(await this.db.user.create({ data }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  setRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
    sessionVersion?: number,
  ) {
    return this.db.user.updateMany({
      where: { id, sessionVersion },
      data: { refreshTokenHash },
    });
  }

  async replaceRefreshTokenHash(
    id: string,
    previousHash: string,
    nextHash: string,
  ) {
    const result = await this.db.user.updateMany({
      where: { id, refreshTokenHash: previousHash },
      data: { refreshTokenHash: nextHash },
    });
    return result.count === 1;
  }

  setRole(id: string, role: UserRole) {
    return this.db.user.updateMany({
      where: { id },
      data: { role, refreshTokenHash: null, sessionVersion: { increment: 1 } },
    });
  }

  async createUserByAdmin(dto: CreateUserByAdminDto) {
    const temporaryPassword = randomBytes(18).toString('base64url');
    const user = await this.insert({
      email: dto.email.trim().toLowerCase(),
      role: dto.role,
      passwordHash: await argon2.hash(temporaryPassword),
      fullName: dto.profile.fullName,
      phone: dto.profile.phone,
      idCardNumber: dto.profile.idCardNumber,
      birthDate: dto.profile.birthDate ? new Date(dto.profile.birthDate) : null,
      avatarUrl: dto.profile.avatarUrl,
      avatarPublicId: dto.profile.avatarPublicId,
    });
    return { message: 'User created successfully', temporaryPassword, user };
  }

  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string,
    confirmation: string,
  ) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    if (!(await argon2.verify(user.passwordHash, oldPassword)))
      throw new UnauthorizedException('Incorrect password');
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword !== confirmation
    ) {
      throw new BadRequestException(
        'Password must have at least 8 characters and match confirmation',
      );
    }
    await this.db.user.update({
      where: { id },
      data: {
        passwordHash: await argon2.hash(newPassword),
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });
    return { message: 'Password changed successfully' };
  }

  async updateAvatar(id: string, avatarUrl: string, avatarPublicId: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    await this.db.user.update({
      where: { id },
      data: { avatarUrl, avatarPublicId },
    });
    if (user.avatarPublicId && user.avatarPublicId !== avatarPublicId)
      await this.uploadService.deleteImage(user.avatarPublicId);
    return {
      message: 'Avatar updated',
      avatar: { url: avatarUrl, publicId: avatarPublicId },
    };
  }

  revokeSessions(id: string) {
    return this.db.user.updateMany({
      where: { id },
      data: {
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });
  }

  async resetTenantPassword(email: string) {
    const temporaryPassword = randomBytes(18).toString('base64url');
    const result = await this.db.user.updateMany({
      where: {
        email: email.trim().toLowerCase(),
        role: 'tenant',
      },
      data: {
        passwordHash: await argon2.hash(temporaryPassword),
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });
    if (!result.count) throw new NotFoundException('Tenant account not found');
    return { temporaryPassword };
  }

  async removeAvatar(id: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    // Unlink only this account's image. Cloud file cleanup remains with the upload workflow.
    await this.db.user.update({
      where: { id },
      data: { avatarUrl: null, avatarPublicId: null },
    });
    return { message: 'Avatar removed', avatar: { url: null, publicId: null } };
  }

  async findById(id: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? publicUser(user) : null;
  }
}
