import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
export class PrivacyController {
  constructor(private privacy: PrivacyService) {}

  @Post('export')
  export(@Req() req: { user: { id: string } }) {
    return this.privacy.requestExport(req.user.id);
  }

  @Delete('account')
  deleteAccount(@Req() req: { user: { id: string } }) {
    return this.privacy.deleteAccount(req.user.id);
  }

  @Post('consent')
  consent(
    @Req() req: { user: { id: string } },
    @Body() body: { marketingConsent?: boolean; pushConsent?: boolean },
  ) {
    return this.privacy.updateConsent(req.user.id, body);
  }
}
