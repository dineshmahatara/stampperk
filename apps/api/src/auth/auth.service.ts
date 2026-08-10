import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import {
  loginSchema,
  oauthLoginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '@stampz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { allocateUniqueQrToken } from '../common/qr-token';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';

const CAPTCHA_AFTER = 3;
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const VERIFY_HOURS = 48;
const WEB_PUBLIC = (process.env.PUBLIC_WEB_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export type ClientMeta = {
  ip?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  deviceType?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private referrals: ReferralsService,
    private notifications: NotificationsService,
  ) {}

  async register(raw: unknown, meta: ClientMeta = {}) {
    const data = registerSchema.parse(raw);
    const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const qrToken = await allocateUniqueQrToken(this.prisma);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
        language: data.language,
        timezone: data.timezone,
        currency: data.currency,
        qrToken,
        emailVerifiedAt: null,
      },
    });

    await this.referrals.ensureReferralCode(user.id);
    if (data.referralCode) {
      await this.referrals.attachOnRegister({
        refereeId: user.id,
        referralCode: data.referralCode,
        referralMerchantId: data.referralMerchantId,
        referralProgramId: data.referralProgramId,
      });
    }

    const verify = await this.issueEmailVerification(user.id, user.email);
    const session = await this.createSessionAndToken(user, meta, false);

    return {
      ...session,
      emailVerified: false,
      verificationRequired: true,
      /** Present in demo/dev so clients can verify without SMTP. */
      verifyToken: process.env.EMAIL_DEV_MODE !== 'false' ? verify.token : undefined,
      verifyUrl:
        process.env.EMAIL_DEV_MODE !== 'false'
          ? `${WEB_PUBLIC}/verify-email?token=${encodeURIComponent(verify.token)}`
          : undefined,
    };
  }

  async login(raw: unknown, meta: ClientMeta = {}) {
    const data = loginSchema.parse(raw);
    const email = data.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.logEvent({
        userId: user.id,
        email,
        success: false,
        reason: 'account_locked',
        meta,
      });
      throw new ForbiddenException({
        message: `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    const needsCaptcha = (user?.failedLoginCount || 0) >= CAPTCHA_AFTER;
    if (needsCaptcha) {
      if (!data.captchaId || !data.captchaAnswer) {
        const captcha = await this.createCaptcha(email);
        throw new ForbiddenException({
          message: 'CAPTCHA required after failed attempts',
          code: 'CAPTCHA_REQUIRED',
          captcha,
        });
      }
      const okCaptcha = await this.verifyCaptcha(data.captchaId, data.captchaAnswer);
      if (!okCaptcha) {
        const captcha = await this.createCaptcha(email);
        throw new ForbiddenException({
          message: 'Incorrect CAPTCHA',
          code: 'CAPTCHA_INVALID',
          captcha,
        });
      }
    }

    const deviceMeta: ClientMeta = {
      ...meta,
      deviceName: data.deviceName || meta.deviceName,
      deviceType: data.deviceType || meta.deviceType,
    };

    if (!user || user.deletedAt) {
      await this.logEvent({ email, success: false, reason: 'invalid_credentials', meta: deviceMeta });
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      const fails = user.failedLoginCount + 1;
      const lockedUntil =
        fails >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: fails,
          lockedUntil: lockedUntil || undefined,
        },
      });
      await this.logEvent({
        userId: user.id,
        email,
        success: false,
        reason: lockedUntil ? 'locked_after_failures' : 'invalid_credentials',
        meta: deviceMeta,
        captchaUsed: needsCaptcha,
      });
      if (lockedUntil) {
        throw new ForbiddenException({
          message: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`,
          code: 'ACCOUNT_LOCKED',
          lockedUntil: lockedUntil.toISOString(),
        });
      }
      if (fails >= CAPTCHA_AFTER) {
        const captcha = await this.createCaptcha(email);
        throw new UnauthorizedException({
          message: 'Invalid credentials',
          code: 'CAPTCHA_REQUIRED',
          captcha,
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const suspicious = this.isSuspicious(user, deviceMeta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: deviceMeta.ip || null,
        lastLoginDevice: deviceMeta.deviceName || deviceMeta.userAgent || null,
      },
    });

    await this.logEvent({
      userId: user.id,
      email,
      success: true,
      reason: suspicious ? 'success_suspicious' : 'success',
      meta: deviceMeta,
      captchaUsed: needsCaptcha,
      suspicious,
    });

    if (suspicious) {
      await this.notifications.create(user.id, {
        title: 'New sign-in detected',
        body: `We noticed a login from ${deviceMeta.deviceName || 'a new device'}${
          deviceMeta.ip ? ` (${deviceMeta.ip})` : ''
        }. If this wasn’t you, revoke sessions in Security settings.`,
        type: 'SYSTEM',
        dataJson: { kind: 'suspicious_login', ip: deviceMeta.ip },
      });
    }

    const session = await this.createSessionAndToken(user, deviceMeta, suspicious);
    return {
      ...session,
      emailVerified: Boolean(user.emailVerifiedAt),
      suspicious,
    };
  }

  async oauthLogin(
    body: unknown,
    meta: ClientMeta = {},
  ) {
    const data = oauthLoginSchema.parse(body);
    const demo = process.env.OAUTH_DEMO_MODE !== 'false';
    let email = data.email?.toLowerCase();
    let name = data.name || 'Stampz User';
    let sub = data.sub || data.idToken.slice(0, 32);

    if (!demo) {
      if (data.provider === 'google') {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${data.idToken}`);
        if (!res.ok) throw new UnauthorizedException('Invalid Google token');
        const info = (await res.json()) as { email?: string; name?: string; sub?: string; aud?: string };
        if (process.env.GOOGLE_CLIENT_ID && info.aud !== process.env.GOOGLE_CLIENT_ID) {
          throw new UnauthorizedException('Google audience mismatch');
        }
        email = info.email?.toLowerCase();
        name = info.name || name;
        sub = info.sub || sub;
      } else if (data.provider === 'microsoft') {
        // Production: validate against Microsoft JWKS / Graph. Demo mode bypasses.
        if (!data.email || !data.sub) {
          throw new BadRequestException('Microsoft Sign-In requires verified email and sub in production');
        }
      } else {
        if (!data.email || !data.sub) {
          throw new BadRequestException('Apple Sign-In requires verified email and sub in production');
        }
      }
    }

    if (!email) throw new BadRequestException('OAuth email required');

    const deviceMeta: ClientMeta = {
      ...meta,
      deviceName: data.deviceName || meta.deviceName,
      deviceType: data.deviceType || meta.deviceType,
    };

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { oauthProvider: data.provider, oauthSub: sub }],
        deletedAt: null,
      },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(`oauth:${data.provider}:${sub}`, 10);
      const qrToken = await allocateUniqueQrToken(this.prisma);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: data.role || 'CUSTOMER',
          oauthProvider: data.provider,
          oauthSub: sub,
          qrToken,
          emailVerifiedAt: new Date(),
        },
      });
      await this.referrals.ensureReferralCode(user.id);
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: data.provider,
          oauthSub: sub,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    }

    const suspicious = this.isSuspicious(user, deviceMeta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: deviceMeta.ip || null,
        lastLoginDevice: deviceMeta.deviceName || deviceMeta.userAgent || null,
      },
    });
    await this.logEvent({
      userId: user.id,
      email,
      success: true,
      reason: `oauth_${data.provider}`,
      meta: deviceMeta,
      suspicious,
    });
    if (suspicious) {
      await this.notifications.create(user.id, {
        title: 'New OAuth sign-in',
        body: `Signed in with ${data.provider} from ${deviceMeta.deviceName || 'a new device'}.`,
        type: 'SYSTEM',
        dataJson: { kind: 'suspicious_login', provider: data.provider },
      });
    }

    return {
      ...(await this.createSessionAndToken(user, deviceMeta, suspicious)),
      emailVerified: true,
      suspicious,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        alternatePhone: true,
        photoUrl: true,
        dateOfBirth: true,
        gender: true,
        language: true,
        timezone: true,
        currency: true,
        country: true,
        province: true,
        district: true,
        city: true,
        municipality: true,
        ward: true,
        streetAddress: true,
        postalCode: true,
        qrToken: true,
        marketingConsent: true,
        pushConsent: true,
        notifyOffers: true,
        notifyLoyalty: true,
        notifyExpiry: true,
        notifyTransfers: true,
        notifyStaff: true,
        lastLat: true,
        lastLng: true,
        lastLocationAt: true,
        createdAt: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDevice: true,
        ownedMerchants: {
          include: {
            subscription: true,
            loyaltyPrograms: { where: { active: true }, take: 5 },
          },
        },
        staffMemberships: {
          where: { active: true },
          include: { merchant: true, branch: true },
        },
      },
    });
    if (!user) throw new BadRequestException('User not found');
    return {
      ...user,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  async listSessions(userId: string, currentSid?: string) {
    const rows = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
    });
    return rows.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      ip: s.ip,
      userAgent: s.userAgent,
      suspicious: s.suspicious,
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      current: currentSid ? s.sessionToken === currentSid : false,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async logoutAll(userId: string, keepSid?: string) {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepSid ? { sessionToken: { not: keepSid } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async loginHistory(userId: string) {
    return this.prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createCaptchaPublic(email?: string) {
    return this.createCaptcha(email?.toLowerCase());
  }

  async verifyEmail(raw: unknown) {
    const data = verifyEmailSchema.parse(raw);
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { token: data.token } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async resendVerification(raw: unknown) {
    const data = resendVerificationSchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || user.deletedAt) return { ok: true };
    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
    const verify = await this.issueEmailVerification(user.id, user.email);
    return {
      ok: true,
      verifyToken: process.env.EMAIL_DEV_MODE !== 'false' ? verify.token : undefined,
      verifyUrl:
        process.env.EMAIL_DEV_MODE !== 'false'
          ? `${WEB_PUBLIC}/verify-email?token=${encodeURIComponent(verify.token)}`
          : undefined,
    };
  }

  async touchSession(sessionToken: string) {
    await this.prisma.authSession.updateMany({
      where: { sessionToken, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  }

  async assertSessionActive(sessionToken: string | undefined, userId: string) {
    if (!sessionToken) return true; // legacy tokens without sid
    const session = await this.prisma.authSession.findFirst({
      where: { sessionToken, userId, revokedAt: null },
    });
    if (!session) throw new UnauthorizedException('Session revoked');
    return true;
  }

  private isSuspicious(
    user: { lastLoginIp?: string | null; lastLoginDevice?: string | null; lastLoginAt?: Date | null },
    meta: ClientMeta,
  ) {
    if (!user.lastLoginAt) return false;
    const ipChanged = Boolean(user.lastLoginIp && meta.ip && user.lastLoginIp !== meta.ip);
    const deviceHint = meta.deviceName || meta.userAgent || '';
    const deviceChanged = Boolean(
      user.lastLoginDevice && deviceHint && !deviceHint.includes(user.lastLoginDevice.slice(0, 24)),
    );
    return ipChanged || deviceChanged;
  }

  private async createSessionAndToken(
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      qrToken: string;
      emailVerifiedAt?: Date | null;
      photoUrl?: string | null;
    },
    meta: ClientMeta,
    suspicious: boolean,
  ) {
    const sessionToken = randomBytes(24).toString('hex');
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        sessionToken,
        deviceName: meta.deviceName || this.guessDevice(meta.userAgent),
        deviceType: meta.deviceType || 'unknown',
        userAgent: meta.userAgent || null,
        ip: meta.ip || null,
        suspicious,
      },
    });

    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionToken,
    });

    return {
      accessToken,
      sessionId: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        qrToken: user.qrToken,
        emailVerified: Boolean(user.emailVerifiedAt),
        photoUrl: user.photoUrl || null,
      },
    };
  }

  private guessDevice(ua?: string | null) {
    if (!ua) return 'Unknown device';
    if (/iPhone|iPad/i.test(ua)) return 'iOS device';
    if (/Android/i.test(ua)) return 'Android device';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS/i.test(ua)) return 'Mac';
    return 'Web browser';
  }

  private async createCaptcha(email?: string | null) {
    const a = randomInt(2, 12);
    const b = randomInt(2, 12);
    const answer = String(a + b);
    const salt = randomBytes(8).toString('hex');
    const answerHash = createHash('sha256').update(`${answer}:${salt}`).digest('hex');
    const row = await this.prisma.captchaChallenge.create({
      data: {
        question: `What is ${a} + ${b}?`,
        answerHash: `${salt}:${answerHash}`,
        email: email || null,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    return { id: row.id, question: row.question };
  }

  private async verifyCaptcha(id: string, answer: string) {
    const row = await this.prisma.captchaChallenge.findUnique({ where: { id } });
    if (!row || row.consumed || row.expiresAt < new Date()) return false;
    const [salt, hash] = row.answerHash.split(':');
    const check = createHash('sha256').update(`${answer.trim()}:${salt}`).digest('hex');
    if (check !== hash) return false;
    await this.prisma.captchaChallenge.update({
      where: { id },
      data: { consumed: true },
    });
    return true;
  }

  private async issueEmailVerification(userId: string, email: string) {
    const token = randomBytes(24).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + VERIFY_HOURS * 3600_000),
      },
    });
    // SMTP hook point — in dev we return token to the client.
    if (process.env.EMAIL_DEV_MODE === 'false') {
      // eslint-disable-next-line no-console
      console.log(`[email] verify ${email}: ${WEB_PUBLIC}/verify-email?token=${token}`);
    }
    return { token };
  }

  private async logEvent(input: {
    userId?: string;
    email: string;
    success: boolean;
    reason?: string;
    meta: ClientMeta;
    captchaUsed?: boolean;
    suspicious?: boolean;
  }) {
    await this.prisma.loginEvent.create({
      data: {
        userId: input.userId,
        email: input.email,
        success: input.success,
        reason: input.reason,
        ip: input.meta.ip || null,
        userAgent: input.meta.userAgent || null,
        deviceName: input.meta.deviceName || null,
        captchaUsed: Boolean(input.captchaUsed),
        suspicious: Boolean(input.suspicious),
      },
    });
  }
}
