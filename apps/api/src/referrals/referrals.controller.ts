import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

type Authed = { user: { id: string } };

@Controller('referrals')
export class ReferralsController {
  constructor(private referrals: ReferralsService) {}

  @Get('me')
  me(@Req() req: Authed) {
    return this.referrals.me(req.user.id);
  }

  /** Attach a referral code for an existing account (e.g. opened merchant share link). */
  @Post('claim')
  claim(
    @Req() req: Authed,
    @Body()
    body: {
      referralCode?: string;
      referralMerchantId?: string;
      referralProgramId?: string;
    },
  ) {
    return this.referrals.attachOnRegister({
      refereeId: req.user.id,
      referralCode: body.referralCode,
      referralMerchantId: body.referralMerchantId,
      referralProgramId: body.referralProgramId,
    });
  }
}
