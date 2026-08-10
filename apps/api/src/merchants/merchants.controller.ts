import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { Public } from '../auth/public.decorator';

type Authed = { user: { id: string } };

function mid(headers: Record<string, string | undefined>) {
  return headers['x-merchant-id'] || headers['X-Merchant-Id'] || undefined;
}

@Controller('merchants')
export class MerchantsController {
  constructor(private merchants: MerchantsService) {}

  @Post()
  create(@Req() req: Authed, @Body() body: unknown) {
    return this.merchants.create(req.user.id, body);
  }

  @Get('mine')
  listMine(@Req() req: Authed) {
    return this.merchants.listMine(req.user.id);
  }

  @Get('me')
  mine(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.getMine(req.user.id, mid(headers));
  }

  @Patch('me')
  update(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Body() body: unknown) {
    return this.merchants.updateMine(req.user.id, body, mid(headers));
  }

  @Get('me/dashboard')
  dashboard(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.dashboard(req.user.id, mid(headers));
  }

  @Get('me/analytics')
  analytics(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.analyticsDeep(req.user.id, mid(headers));
  }

  @Get('me/customers/lookup')
  lookupCustomer(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    return this.merchants.lookupCustomer(req.user.id, { email, phone }, mid(headers));
  }

  @Post('me/customers/invite')
  inviteCustomer(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.merchants.inviteCustomer(req.user.id, body, mid(headers));
  }

  @Get('me/customers')
  customers(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.listCustomers(req.user.id, mid(headers));
  }

  @Get('me/coupons')
  coupons(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.listCoupons(req.user.id, mid(headers));
  }

  @Post('me/coupons')
  createCoupon(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.merchants.createCoupon(req.user.id, body, mid(headers));
  }

  @Post('me/coupons/redeem')
  redeemCoupon(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.merchants.redeemCoupon(req.user.id, body, mid(headers));
  }

  @Patch('me/coupons/:id')
  updateCoupon(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.merchants.updateCoupon(req.user.id, id, body, mid(headers));
  }

  @Get('me/reports/customers')
  reportCustomers(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.reportCustomersCsv(req.user.id, from, to, mid(headers));
  }

  @Get('me/reports/stamps')
  reportStamps(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.reportStampsCsv(req.user.id, from, to, mid(headers));
  }

  @Get('me/reports/redemptions')
  reportRedemptions(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.reportRedemptionsCsv(req.user.id, from, to, mid(headers));
  }

  @Get('me/reports/campaigns')
  reportCampaigns(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.reportCampaignsCsv(req.user.id, from, to, mid(headers));
  }

  @Get('me/stamps')
  stamps(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.listStamps(req.user.id, mid(headers));
  }

  @Get('me/redemptions')
  redemptions(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.listRedemptions(req.user.id, mid(headers));
  }

  @Get('me/rewards')
  rewards(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.listRewards(req.user.id, mid(headers));
  }

  @Post('me/staff')
  inviteStaff(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Body() body: unknown) {
    return this.merchants.inviteStaff(req.user.id, body, mid(headers));
  }

  @Patch('me/staff/:id')
  updateStaff(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.merchants.updateStaff(req.user.id, id, body, mid(headers));
  }

  @Delete('me/staff/:id')
  removeStaff(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Param('id') id: string) {
    return this.merchants.removeStaff(req.user.id, id, mid(headers));
  }

  @Post('me/branches')
  addBranch(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { name: string; address?: string; phone?: string; latitude?: number; longitude?: number },
  ) {
    return this.merchants.addBranch(req.user.id, body, mid(headers));
  }

  @Patch('me/branches/:id')
  updateBranch(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      address?: string | null;
      phone?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    return this.merchants.updateBranch(req.user.id, id, body, mid(headers));
  }

  @Delete('me/branches/:id')
  removeBranch(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Param('id') id: string) {
    return this.merchants.removeBranch(req.user.id, id, mid(headers));
  }

  @Post('me/gallery')
  addGallery(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Body() body: { url: string }) {
    return this.merchants.addGalleryPhoto(req.user.id, body.url, mid(headers));
  }

  @Post('me/menu')
  addMenu(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { name: string; description?: string; price?: number; imageUrl?: string },
  ) {
    return this.merchants.addMenuItem(req.user.id, body, mid(headers));
  }

  @Post('me/links')
  addLink(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>, @Body() body: { label: string; url: string }) {
    return this.merchants.addPublicLink(req.user.id, body, mid(headers));
  }

  @Post('me/adjustments/sales')
  salesAdj(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.merchants.addSalesAdjustment(req.user.id, body, mid(headers));
  }

  @Post('me/adjustments/savings')
  savingsAdj(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.merchants.addSavingsAdjustment(req.user.id, body, mid(headers));
  }

  @Get('me/verification')
  getVerification(@Req() req: Authed, @Headers() headers: Record<string, string | undefined>) {
    return this.merchants.getVerification(req.user.id, mid(headers));
  }

  @Post('me/verification')
  applyVerification(
    @Req() req: Authed,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.merchants.applyVerification(req.user.id, body, mid(headers));
  }

  @Public()
  @Get('public/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.merchants.getBySlug(slug);
  }
}
