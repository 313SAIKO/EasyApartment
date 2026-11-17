// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { UsersService } from '../../users/users.service';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      // อ่าน Authorization: Bearer <access_token> จาก request
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      // secretOrKey: config.get<string>('JWT_SECRET') || '',
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || '',
    });
  }

  async validate(payload: JwtPayload) {
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw new UnauthorizedException();
    }
    const user = await this.users.findById(payload.sub);
    if (
      !user ||
      !Number.isInteger(payload.version) ||
      user.sessionVersion !== payload.version
    ) {
      throw new UnauthorizedException('Session expired; sign in again');
    }
    return { ...payload, role: user.role, email: user.email };
  }
}
