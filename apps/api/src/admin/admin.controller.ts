import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { LeafletsService } from '../leaflets/leaflets.service';

@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private leaflets: LeafletsService,
  ) {}

  @Get('overview')
  overview(@Req() req: { user: { role: string } }) {
    return this.admin.overview(req.user.role);
  }

  @Get('merchants')
  merchants(@Req() req: { user: { role: string } }) {
    return this.admin.listMerchants(req.user.role);
  }

  @Get('merchants-geo')
  merchantsGeo(@Req() req: { user: { role: string } }) {
    return this.admin.listMerchantsGeo(req.user.role);
  }

  @Get('merchants/:id')
  getMerchant(@Req() req: { user: { role: string } }, @Param('id') id: string) {
    return this.admin.getMerchant(req.user.role, id);
  }

  @Post('merchants')
  createMerchant(@Req() req: { user: { role: string } }, @Body() body: unknown) {
    return this.admin.createMerchant(req.user.role, body);
  }

  @Patch('merchants/:id')
  updateMerchant(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.admin.updateMerchant(req.user.role, id, body);
  }

  @Delete('merchants/:id')
  deleteMerchant(@Req() req: { user: { role: string } }, @Param('id') id: string) {
    return this.admin.deleteMerchant(req.user.role, id);
  }

  @Patch('merchants/:id/status')
  status(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' },
  ) {
    return this.admin.setMerchantStatus(req.user.role, id, body.status);
  }

  @Get('verifications')
  verifications(
    @Req() req: { user: { role: string } },
    @Query('status') status?: string,
  ) {
    return this.admin.listVerifications(req.user.role, status);
  }

  @Patch('verifications/:merchantId')
  patchVerification(
    @Req() req: { user: { role: string } },
    @Param('merchantId') merchantId: string,
    @Body() body: unknown,
  ) {
    return this.admin.reviewVerification(req.user.role, merchantId, body);
  }

  @Get('users')
  users(@Req() req: { user: { role: string } }, @Query('role') roleFilter?: string) {
    return this.admin.listUsers(req.user.role, roleFilter);
  }

  @Patch('users/:id')
  patchUser(
    @Req() req: { user: { role: string; userId?: string; id?: string } },
    @Param('id') id: string,
    @Body()
    body: {
      role?: 'CUSTOMER' | 'MERCHANT_OWNER' | 'STAFF' | 'SUPER_ADMIN';
      deletedAt?: string | null;
    },
  ) {
    return this.admin.patchUser(req.user.role, id, body);
  }

  @Get('customers')
  customers(@Req() req: { user: { role: string } }) {
    return this.admin.listCustomers(req.user.role);
  }

  @Get('staff')
  staff(@Req() req: { user: { role: string } }) {
    return this.admin.listStaff(req.user.role);
  }

  @Patch('staff/:id')
  patchStaff(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    return this.admin.patchStaff(req.user.role, id, body);
  }

  @Get('subscriptions')
  subscriptions(@Req() req: { user: { role: string } }) {
    return this.admin.listSubscriptions(req.user.role);
  }

  @Get('pricing')
  getPricing(@Req() req: { user: { role: string } }) {
    return this.admin.getPricingCatalog(req.user.role);
  }

  @Put('pricing')
  putPricing(@Req() req: { user: { role: string } }, @Body() body: unknown) {
    return this.admin.updatePricingCatalog(req.user.role, body);
  }

  @Get('invoices')
  invoices(@Req() req: { user: { role: string } }) {
    return this.admin.listInvoices(req.user.role);
  }

  @Get('billing-overview')
  billingOverview(@Req() req: { user: { role: string } }) {
    return this.admin.billingOverview(req.user.role);
  }

  @Patch('subscriptions/:id')
  patchSubscription(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { plan?: string; status?: string },
  ) {
    return this.admin.patchSubscription(req.user.role, id, body);
  }

  @Get('transactions')
  transactions(@Req() req: { user: { role: string } }) {
    return this.admin.listTransactions(req.user.role);
  }

  @Get('loyalty-programs')
  loyaltyPrograms(@Req() req: { user: { role: string } }) {
    return this.admin.listLoyaltyPrograms(req.user.role);
  }

  @Get('loyalty-programs-overview')
  loyaltyProgramsOverview(@Req() req: { user: { role: string } }) {
    return this.admin.loyaltyProgramsOverview(req.user.role);
  }

  @Post('loyalty-programs')
  createLoyaltyProgram(@Req() req: { user: { role: string } }, @Body() body: unknown) {
    return this.admin.createLoyaltyProgram(req.user.role, body);
  }

  @Patch('loyalty-programs/:id')
  patchLoyalty(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { active?: boolean; title?: string },
  ) {
    return this.admin.patchLoyaltyProgram(req.user.role, id, body);
  }

  @Get('rewards')
  rewards(@Req() req: { user: { role: string } }) {
    return this.admin.listRewards(req.user.role);
  }

  @Get('redemptions')
  redemptions(@Req() req: { user: { role: string } }) {
    return this.admin.listRedemptions(req.user.role);
  }

  @Get('promotions')
  promotions(@Req() req: { user: { role: string } }) {
    return this.admin.listPromotions(req.user.role);
  }

  @Patch('promotions/:id')
  patchPromotion(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { status?: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'ENDED' },
  ) {
    return this.admin.patchPromotion(req.user.role, id, body);
  }

  @Get('stamps')
  stamps(@Req() req: { user: { role: string } }) {
    return this.admin.listStamps(req.user.role);
  }

  @Get('activity')
  activity(@Req() req: { user: { role: string } }) {
    return this.admin.listActivity(req.user.role);
  }

  @Get('analytics')
  analytics(@Req() req: { user: { role: string } }) {
    return this.admin.analytics(req.user.role);
  }

  @Get('reports')
  reports(@Req() req: { user: { role: string } }) {
    return this.admin.reports(req.user.role);
  }

  @Get('settings')
  settings(@Req() req: { user: { role: string } }) {
    return this.admin.settings(req.user.role);
  }

  @Get('support-tickets')
  supportTickets(@Req() req: { user: { role: string } }) {
    return this.admin.listSupportTickets(req.user.role);
  }

  @Post('support-tickets')
  createTicket(
    @Req() req: { user: { role: string } },
    @Body()
    body: {
      subject: string;
      body: string;
      priority?: string;
      requesterEmail?: string;
      requesterName?: string;
    },
  ) {
    return this.admin.createSupportTicket(req.user.role, body);
  }

  @Patch('support-tickets/:id')
  patchTicket(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: string; assignedTo?: string },
  ) {
    return this.admin.patchSupportTicket(req.user.role, id, body);
  }

  @Get('leaflet-templates')
  listLeafletTemplates(@Req() req: { user: { role: string } }) {
    return this.leaflets.listTemplatesAdmin(req.user.role);
  }

  @Post('leaflet-templates')
  createLeafletTemplate(@Req() req: { user: { role: string } }, @Body() body: unknown) {
    return this.leaflets.createTemplate(req.user.role, body);
  }

  @Patch('leaflet-templates/:id')
  updateLeafletTemplate(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.leaflets.updateTemplate(req.user.role, id, body);
  }

  @Get('notifications')
  notifications(@Req() req: { user: { role: string; id: string; userId?: string } }) {
    const userId = req.user.id || req.user.userId;
    return this.admin.listAdminNotifications(req.user.role, userId!);
  }

  @Patch('notifications/:id/read')
  readNotification(
    @Req() req: { user: { role: string; id: string; userId?: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.admin.markAdminNotificationRead(req.user.role, userId!, id);
  }

  @Post('notifications/read-all')
  readAllNotifications(@Req() req: { user: { role: string; id: string; userId?: string } }) {
    const userId = req.user.id || req.user.userId;
    return this.admin.markAllAdminNotificationsRead(req.user.role, userId!);
  }
}
