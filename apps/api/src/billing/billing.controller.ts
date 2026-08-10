import { Body, Controller, Get, Headers, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { Public } from '../auth/public.decorator';

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Public()
  @Get('plans')
  plans(@Query('country') country?: string) {
    return this.billing.getPlans(country);
  }

  @Get('subscription')
  subscription(@Req() req: { user: { id: string } }) {
    return this.billing.getSubscription(req.user.id);
  }

  @Get('invoices')
  invoices(@Req() req: { user: { id: string } }) {
    return this.billing.listInvoices(req.user.id);
  }

  @Post('checkout')
  checkout(@Req() req: { user: { id: string } }, @Body() body: { plan: 'MONTHLY' | 'YEARLY' }) {
    return this.billing.createCheckout(req.user.id, body.plan);
  }

  @Post('cancel')
  cancel(@Req() req: { user: { id: string } }) {
    return this.billing.cancelSubscription(req.user.id);
  }

  @Post('addons')
  addons(
    @Req() req: { user: { id: string } },
    @Body() body: { extraBranches?: number; extraStaff?: number },
  ) {
    return this.billing.updateAddons(req.user.id, body);
  }

  @Post('verified/checkout')
  verifiedCheckout(
    @Req() req: { user: { id: string } },
    @Body() body: { interval?: 'monthly' | 'yearly' },
  ) {
    return this.billing.createVerifiedCheckout(req.user.id, body.interval === 'yearly' ? 'yearly' : 'monthly');
  }

  @Post('iap/apple')
  apple(
    @Req() req: { user: { id: string } },
    @Body() body: { originalTransactionId: string; productId: string },
  ) {
    return this.billing.verifyAppleIap(req.user.id, body);
  }

  @Post('iap/google')
  google(
    @Req() req: { user: { id: string } },
    @Body() body: { purchaseToken: string; productId: string },
  ) {
    return this.billing.verifyGoogleIap(req.user.id, body);
  }

  @Public()
  @Post('webhooks/stripe')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.billing.handleStripeWebhook(raw, signature || '');
  }
}
