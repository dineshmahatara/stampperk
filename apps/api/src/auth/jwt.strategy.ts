import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

export type JwtPayload = { sub: string; email: string; role: string; sid?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService)) private auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.sid) {
      const session = await this.prisma.authSession.findFirst({
        where: { sessionToken: payload.sid, userId: payload.sub, revokedAt: null },
      });
      if (!session) throw new UnauthorizedException('Session revoked');
      void this.auth.touchSession(payload.sid);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        timezone: true,
        currency: true,
        qrToken: true,
        phone: true,
        photoUrl: true,
        marketingConsent: true,
        pushConsent: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return { ...user, sid: payload.sid };
  }
}
