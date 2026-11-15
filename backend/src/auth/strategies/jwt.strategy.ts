// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // อ่าน Authorization: Bearer <access_token> จาก request
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      // secretOrKey: config.get<string>('JWT_SECRET') || '',
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || '',
    });
  }

  validate(payload: JwtPayload) {
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
