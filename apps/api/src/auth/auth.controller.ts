import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AuthService, type ClientMeta } from './auth.service';
import { Public } from './public.decorator';

type Authed = { user: { id: string; sid?: string } };

function clientMeta(
  req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  body?: { deviceName?: string; deviceType?: string },
): ClientMeta {
  const ua = req.headers['user-agent'];
  const xf = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    null;
  return {
    ip,
    userAgent: Array.isArray(ua) ? ua[0] : ua || null,
    deviceName: body?.deviceName,
    deviceType: body?.deviceType,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body() body: unknown,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.auth.register(body, clientMeta(req, body as { deviceName?: string; deviceType?: string }));
  }

  @Public()
  @Post('login')
  login(
    @Body() body: unknown,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.auth.login(body, clientMeta(req, body as { deviceName?: string; deviceType?: string }));
  }

  @Public()
  @Post('oauth')
  oauth(
    @Body() body: unknown,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.auth.oauthLogin(body, clientMeta(req, body as { deviceName?: string; deviceType?: string }));
  }

  @Public()
  @Get('captcha')
  captcha(@Query('email') email?: string) {
    return this.auth.createCaptchaPublic(email);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() body: unknown) {
    return this.auth.verifyEmail(body);
  }

  @Public()
  @Post('resend-verification')
  resendVerification(@Body() body: unknown) {
    return this.auth.resendVerification(body);
  }

  @Get('me')
  me(@Req() req: Authed) {
    return this.auth.me(req.user.id);
  }

  @Get('sessions')
  sessions(@Req() req: Authed) {
    return this.auth.listSessions(req.user.id, req.user.sid);
  }

  @Delete('sessions/:id')
  revokeSession(@Req() req: Authed, @Param('id') id: string) {
    return this.auth.revokeSession(req.user.id, id);
  }

  @Post('logout-all')
  logoutAll(@Req() req: Authed, @Body() body: { keepCurrent?: boolean }) {
    return this.auth.logoutAll(req.user.id, body?.keepCurrent === false ? undefined : req.user.sid);
  }

  @Get('login-history')
  loginHistory(@Req() req: Authed) {
    return this.auth.loginHistory(req.user.id);
  }
}
