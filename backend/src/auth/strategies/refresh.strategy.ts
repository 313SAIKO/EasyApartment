// src/auth/strategies/refrech.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { isUUID } from 'class-validator';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),

      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (
      !refreshToken ||
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub)
    ) {
      throw new UnauthorizedException();
    }

    return { ...payload, refreshToken };
  }
}
