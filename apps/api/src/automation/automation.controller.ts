import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { MerchantsService } from '../merchants/merchants.service';

type Authed = { user: { id: string; role: string } };

@Controller()
export class AutomationController {
  constructor(
    private automation: AutomationService,
    private merchants: MerchantsService,
  ) {}

  private mid(headers: Record<string, string | undefined>) {
    return headers['x-merchant-id'] || headers['X-Merchant-Id'];
  }

  @Get('merchants/me/automations')
  async list(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    const merchant = await this.merchants.getAccessibleMerchant(req.user.id, this.mid(headers));
    await this.automation.ensureDefaultRules(merchant.id);
    return this.automation.listRules(merchant.id);
  }

  @Patch('merchants/me/automations/:id')
  async patch(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    const merchant = await this.merchants.requireOwner(req.user.id, this.mid(headers));
    await this.automation.setRuleActive(merchant.id, id, Boolean(body.active));
    return this.automation.listRules(merchant.id);
  }

  @Post('merchants/me/automations/run')
  async run(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    const merchant = await this.merchants.requireOwner(req.user.id, this.mid(headers));
    await this.automation.ensureDefaultRules(merchant.id);
    const fired = await this.automation.runForMerchant(merchant.id, merchant.businessName);
    return { ok: true, fired };
  }
}
