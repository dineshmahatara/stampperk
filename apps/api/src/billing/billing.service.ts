import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import {
  VERIFIED_ADDON_PRICES,
  isMerchantVerifiedLive,
  stripePriceIdForPlan,
  stripeVerifiedPriceId,
  type BillingRegion,
} from '@stampz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pricingCatalog: PricingCatalogService,
  ) {
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('xxx')) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  }

  private regionForCountry(country?: string | null): BillingRegion {
    return this.pricingCatalog.regionFromCountry(country);
  }

  private planAmount(plan: 'MONTHLY' | 'YEARLY', region: BillingRegion) {
    return plan === 'YEARLY' ? region.yearlyAmount : region.monthlyAmount;
  }

  private planDisplayName(plan: string) {
    return this.pricingCatalog.planLimits(plan).displayName;
  }

  async getPlans(country?: string | null) {
    const region = this.regionForCountry(country);
    const regionRow = this.pricingCatalog.getRegion(region.code);
    const savingsPercent = region.yearlyWasAmount
      ? Math.round((1 - region.yearlyAmount / region.yearlyWasAmount) * 100)
      : 0;
    const catalog = this.pricingCatalog.getCatalog();
    const cards = this.pricingCatalog.publicPlanCards();
    return {
      region: {
        code: region.code,
        currency: region.currency,
        label: region.label,
        trialDays: regionRow.trialDays,
      },
      regions: catalog.regions.map((r) => ({
        code: r.regionCode,
        currency: r.currency,
        label: r.label,
        monthlyAmount: r.monthlyAmount,
        yearlyAmount: r.yearlyAmount,
        yearlyWasAmount: r.yearlyWasAmount,
        trialDays: r.trialDays,
      })),
      catalog: cards,
      free: {
        plan: 'FREE',
        priceMonthly: 0,
        priceYearly: 0,
        ...(cards.free as object),
      },
      monthly: {
        plan: 'MONTHLY',
        priceMonthly: region.monthlyAmount,
        currency: region.currency,
        displayName: this.planDisplayName('MONTHLY'),
        trialDays: regionRow.trialDays,
        stripePriceId: stripePriceIdForPlan('MONTHLY', region.code),
        ...(cards.monthly as object),
      },
      yearly: {
        plan: 'YEARLY',
        priceYearly: region.yearlyAmount,
        yearlyWasAmount: region.yearlyWasAmount,
        currency: region.currency,
        displayName: this.planDisplayName('YEARLY'),
        savingsPercent,
        stripePriceId: stripePriceIdForPlan('YEARLY', region.code),
        ...(cards.yearly as object),
      },
      verifiedMonthly: {
        addon: 'VERIFIED',
        interval: 'monthly',
        price: VERIFIED_ADDON_PRICES.monthly.price,
        currency: VERIFIED_ADDON_PRICES.monthly.currency,
        stripePriceId: stripeVerifiedPriceId('monthly', region.code),
      },
      verifiedYearly: {
        addon: 'VERIFIED',
        interval: 'yearly',
        price: VERIFIED_ADDON_PRICES.yearly.price,
        currency: VERIFIED_ADDON_PRICES.yearly.currency,
        savingsPercent: VERIFIED_ADDON_PRICES.yearly.savingsPercent,
        stripePriceId: stripeVerifiedPriceId('yearly', region.code),
      },
    };
  }

  async getSubscription(userId: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant?.subscription) throw new NotFoundException('No subscription');
    const sub = merchant.subscription;
    const verified = isMerchantVerifiedLive({
      verificationStatus: merchant.verificationStatus,
      verifiedAddon: sub.verifiedAddon,
      verifiedUntil: sub.verifiedUntil,
    });
    return {
      ...sub,
      trialEndsAt: sub.trialEndsAt,
      graceEndsAt: sub.graceEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      extraBranches: sub.extraBranches,
      extraStaff: sub.extraStaff,
      displayName: this.planDisplayName(sub.plan) || sub.plan,
      verificationStatus: merchant.verificationStatus,
      verified,
    };
  }

  private async ownerMerchant(userId: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Owner required');
    return merchant;
  }

  private periodEndFor(plan: 'MONTHLY' | 'YEARLY') {
    return new Date(Date.now() + (plan === 'YEARLY' ? 365 : 30) * 86400000);
  }

  private async createPaidInvoice(input: {
    subscriptionId: string;
    merchantId: string;
    amount: number;
    currency?: string;
    description?: string;
    stripeInvoiceId?: string | null;
    pdfUrl?: string | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  }) {
    const existing = input.stripeInvoiceId
      ? await this.prisma.invoice.findFirst({ where: { stripeInvoiceId: input.stripeInvoiceId } })
      : null;
    if (existing) {
      return this.prisma.invoice.update({
        where: { id: existing.id },
        data: {
          amount: input.amount,
          status: 'PAID',
          paidAt: existing.paidAt || new Date(),
          pdfUrl: input.pdfUrl ?? existing.pdfUrl,
          description: input.description ?? existing.description,
          periodStart: input.periodStart ?? existing.periodStart,
          periodEnd: input.periodEnd ?? existing.periodEnd,
        },
      });
    }
    return this.prisma.invoice.create({
      data: {
        subscriptionId: input.subscriptionId,
        merchantId: input.merchantId,
        amount: input.amount,
        currency: input.currency || 'USD',
        status: 'PAID',
        stripeInvoiceId: input.stripeInvoiceId || null,
        pdfUrl: input.pdfUrl || null,
        description: input.description || null,
        periodStart: input.periodStart || null,
        periodEnd: input.periodEnd || null,
        paidAt: new Date(),
      },
    });
  }

  async createCheckout(userId: string, plan: 'MONTHLY' | 'YEARLY') {
    const merchant = await this.ownerMerchant(userId);
    const periodEnd = this.periodEndFor(plan);
    const region = this.regionForCountry(merchant.country);

    if (!this.stripe) {
      const sub = await this.prisma.subscription.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          plan,
          status: 'ACTIVE',
          provider: 'MANUAL',
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan,
          status: 'ACTIVE',
          provider: 'MANUAL',
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
        },
      });

      await this.createPaidInvoice({
        subscriptionId: sub.id,
        merchantId: merchant.id,
        amount: this.planAmount(plan, region),
        currency: region.currency,
        description: `${this.planDisplayName(plan)} plan (${region.code})`,
        periodStart: new Date(),
        periodEnd,
      });

      void this.notifications.notifyAdmins({
        title: 'Plan changed',
        body: `${merchant.businessName} upgraded to ${this.planDisplayName(plan)} (${region.code}, mock checkout).`,
        href: '/admin/subscriptions',
        entityType: 'Subscription',
        entityId: sub.id,
        actorUserId: userId,
        auditAction: 'BILLING_CHECKOUT_MOCK',
      });

      return { mode: 'mock', subscription: sub, url: null, region: region.code };
    }

    const priceId = stripePriceIdForPlan(plan, region.code);
    if (!priceId) {
      throw new BadRequestException(
        `Stripe price not configured for ${region.code} (${plan}). Set STRIPE_PRICE_${plan}_${region.code} or STRIPE_PRICE_${plan}.`,
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000'}/dashboard/billing?success=1`,
      cancel_url: `${process.env.APP_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000'}/dashboard/billing?canceled=1`,
      metadata: {
        merchantId: merchant.id,
        plan,
        kind: 'plan',
        billingRegion: region.code,
        currency: region.currency,
      },
    });

    return { mode: 'stripe', url: session.url, region: region.code };
  }

  async createVerifiedCheckout(userId: string, interval: 'monthly' | 'yearly') {
    const merchant = await this.ownerMerchant(userId);
    if (merchant.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Admin must approve verification before you can pay for the badge');
    }

    const region = this.regionForCountry(merchant.country);
    const days = interval === 'yearly' ? VERIFIED_ADDON_PRICES.yearly.days : VERIFIED_ADDON_PRICES.monthly.days;
    const until = new Date(Date.now() + days * 86400000);

    if (!this.stripe) {
      const sub = await this.prisma.subscription.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          plan: 'FREE',
          status: 'ACTIVE',
          provider: 'MANUAL',
          verifiedAddon: true,
          verifiedUntil: until,
        },
        update: {
          verifiedAddon: true,
          verifiedUntil: until,
        },
      });
      return {
        mode: 'mock',
        url: null,
        subscription: sub,
        verified: true,
        region: region.code,
      };
    }

    const priceId = stripeVerifiedPriceId(interval, region.code);
    if (!priceId) throw new BadRequestException('Verified Stripe price not configured');

    const base = process.env.APP_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/dashboard/billing?verified=1`,
      cancel_url: `${base}/dashboard/billing?canceled=1`,
      metadata: {
        merchantId: merchant.id,
        kind: 'verified',
        interval,
        billingRegion: region.code,
      },
    });

    return { mode: 'stripe', url: session.url, region: region.code };
  }

  async cancelSubscription(userId: string) {
    const merchant = await this.ownerMerchant(userId);
    if (!merchant.subscription) throw new NotFoundException('No subscription');

    if (this.stripe && merchant.subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(merchant.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const sub = await this.prisma.subscription.update({
      where: { id: merchant.subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    void this.notifications.notifyAdmins({
      title: 'Subscription cancel scheduled',
      body: `${merchant.businessName} set cancel at period end.`,
      href: '/admin/subscriptions',
      entityType: 'Subscription',
      entityId: sub.id,
      actorUserId: userId,
      auditAction: 'BILLING_CANCEL_AT_PERIOD_END',
    });

    return sub;
  }

  async listInvoices(userId: string) {
    const merchant = await this.ownerMerchant(userId);
    return this.prisma.invoice.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateAddons(userId: string, body: { extraBranches?: number; extraStaff?: number }) {
    const merchant = await this.ownerMerchant(userId);
    if (!merchant.subscription) throw new NotFoundException('No subscription');

    const data: { extraBranches?: number; extraStaff?: number } = {};
    if (typeof body.extraBranches === 'number') {
      if (body.extraBranches < 0) throw new BadRequestException('extraBranches must be >= 0');
      data.extraBranches = Math.floor(body.extraBranches);
    }
    if (typeof body.extraStaff === 'number') {
      if (body.extraStaff < 0) throw new BadRequestException('extraStaff must be >= 0');
      data.extraStaff = Math.floor(body.extraStaff);
    }
    if (!Object.keys(data).length) {
      throw new BadRequestException('Provide extraBranches and/or extraStaff');
    }

    const sub = await this.prisma.subscription.update({
      where: { id: merchant.subscription.id },
      data,
    });

    void this.notifications.notifyAdmins({
      title: 'Add-ons updated',
      body: `${merchant.businessName}: branches +${sub.extraBranches}, staff +${sub.extraStaff}`,
      href: '/admin/subscriptions',
      entityType: 'Subscription',
      entityId: sub.id,
      actorUserId: userId,
      auditAction: 'BILLING_ADDONS_UPDATE',
    });

    return sub;
  }

  async verifyAppleIap(userId: string, body: { originalTransactionId: string; productId: string }) {
    const merchant = await this.ownerMerchant(userId);
    const plan = body.productId.includes('yearly') ? 'YEARLY' : 'MONTHLY';
    return this.prisma.subscription.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        plan,
        status: 'ACTIVE',
        provider: 'APPLE',
        appleOriginalTxId: body.originalTransactionId,
        currentPeriodEnd: this.periodEndFor(plan),
        trialEndsAt: null,
      },
      update: {
        plan,
        status: 'ACTIVE',
        provider: 'APPLE',
        appleOriginalTxId: body.originalTransactionId,
        trialEndsAt: null,
      },
    });
  }

  async verifyGoogleIap(userId: string, body: { purchaseToken: string; productId: string }) {
    const merchant = await this.ownerMerchant(userId);
    const plan = body.productId.includes('yearly') ? 'YEARLY' : 'MONTHLY';
    return this.prisma.subscription.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        plan,
        status: 'ACTIVE',
        provider: 'GOOGLE',
        googlePurchaseToken: body.purchaseToken,
        currentPeriodEnd: this.periodEndFor(plan),
        trialEndsAt: null,
      },
      update: {
        plan,
        status: 'ACTIVE',
        provider: 'GOOGLE',
        googlePurchaseToken: body.purchaseToken,
        trialEndsAt: null,
      },
    });
  }

  private async findSubByStripe(ids: {
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
  }) {
    if (ids.stripeSubscriptionId) {
      const bySub = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: ids.stripeSubscriptionId },
        include: { merchant: { select: { businessName: true } } },
      });
      if (bySub) return bySub;
    }
    if (ids.stripeCustomerId) {
      return this.prisma.subscription.findFirst({
        where: { stripeCustomerId: ids.stripeCustomerId },
        include: { merchant: { select: { businessName: true } } },
      });
    }
    return null;
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) return { received: true, mode: 'mock' };
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('Webhook secret missing');
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const merchantId = session.metadata?.merchantId;
      const kind = session.metadata?.kind || 'plan';
      if (!merchantId) return { received: true };

      if (kind === 'verified') {
        const interval = session.metadata?.interval === 'yearly' ? 'yearly' : 'monthly';
        const days =
          interval === 'yearly' ? VERIFIED_ADDON_PRICES.yearly.days : VERIFIED_ADDON_PRICES.monthly.days;
        const sub = await this.prisma.subscription.upsert({
          where: { merchantId },
          create: {
            merchantId,
            plan: 'FREE',
            status: 'ACTIVE',
            provider: 'STRIPE',
            stripeCustomerId: String(session.customer || ''),
            verifiedStripeSubscriptionId: String(session.subscription || ''),
            verifiedAddon: true,
            verifiedUntil: new Date(Date.now() + days * 86400000),
          },
          update: {
            provider: 'STRIPE',
            stripeCustomerId: String(session.customer || ''),
            verifiedStripeSubscriptionId: String(session.subscription || ''),
            verifiedAddon: true,
            verifiedUntil: new Date(Date.now() + days * 86400000),
          },
        });

        const amount =
          typeof session.amount_total === 'number'
            ? session.amount_total / 100
            : interval === 'yearly'
              ? VERIFIED_ADDON_PRICES.yearly.price
              : VERIFIED_ADDON_PRICES.monthly.price;
        await this.createPaidInvoice({
          subscriptionId: sub.id,
          merchantId,
          amount,
          currency: (session.currency || 'usd').toUpperCase(),
          description: `Stampz Verified (${interval})`,
          stripeInvoiceId: session.invoice ? String(session.invoice) : null,
        });
      } else {
        const plan = (session.metadata?.plan as 'MONTHLY' | 'YEARLY') || 'MONTHLY';
        const periodEnd = this.periodEndFor(plan);
        const sub = await this.prisma.subscription.upsert({
          where: { merchantId },
          create: {
            merchantId,
            plan,
            status: 'ACTIVE',
            provider: 'STRIPE',
            stripeCustomerId: String(session.customer || ''),
            stripeSubscriptionId: String(session.subscription || ''),
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
            graceEndsAt: null,
            cancelAtPeriodEnd: false,
          },
          update: {
            plan,
            status: 'ACTIVE',
            provider: 'STRIPE',
            stripeCustomerId: String(session.customer || ''),
            stripeSubscriptionId: String(session.subscription || ''),
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
            graceEndsAt: null,
            cancelAtPeriodEnd: false,
          },
        });

        const merchant = await this.prisma.merchant.findUnique({
          where: { id: merchantId },
          select: { businessName: true, country: true },
        });
        const region = this.regionForCountry(
          session.metadata?.billingRegion || merchant?.country,
        );
        const amount =
          typeof session.amount_total === 'number'
            ? session.amount_total / 100
            : this.planAmount(plan, region);
        await this.createPaidInvoice({
          subscriptionId: sub.id,
          merchantId,
          amount,
          currency: (session.currency || region.currency || 'usd').toUpperCase(),
          description: `${this.planDisplayName(plan)} plan (${region.code})`,
          stripeInvoiceId: session.invoice ? String(session.invoice) : null,
          periodStart: new Date(),
          periodEnd,
        });

        void this.notifications.notifyAdmins({
          title: 'Plan changed',
          body: `${merchant?.businessName || 'Merchant'} upgraded to ${this.planDisplayName(plan)} (${region.code}).`,
          href: '/admin/subscriptions',
          entityType: 'Subscription',
          entityId: sub.id,
          auditAction: 'BILLING_CHECKOUT_STRIPE',
        });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      const stripeCustomerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const sub = await this.findSubByStripe({
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId,
      });
      if (sub) {
        const graceEndsAt = new Date(Date.now() + 7 * 86400000);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE', graceEndsAt },
        });
        void this.notifications.notifyAdmins({
          title: 'Payment failed',
          body: `${sub.merchant.businessName} is PAST_DUE (grace until ${graceEndsAt.toISOString().slice(0, 10)}).`,
          href: '/admin/subscriptions',
          entityType: 'Subscription',
          entityId: sub.id,
          auditAction: 'BILLING_PAYMENT_FAILED',
        });
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      const stripeCustomerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const stripeInvoiceId = invoice.id;
      const sub = await this.findSubByStripe({
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId,
      });
      if (sub) {
        const periodEnd = invoice.lines?.data?.[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000)
          : sub.currentPeriodEnd;
        const periodStart = invoice.lines?.data?.[0]?.period?.start
          ? new Date(invoice.lines.data[0].period.start * 1000)
          : null;
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            graceEndsAt: null,
            trialEndsAt: null,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        });
        await this.createPaidInvoice({
          subscriptionId: sub.id,
          merchantId: sub.merchantId,
          amount: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
          currency: (invoice.currency || 'usd').toUpperCase(),
          description: invoice.description || invoice.lines?.data?.[0]?.description || 'Subscription invoice',
          stripeInvoiceId,
          pdfUrl: invoice.invoice_pdf || null,
          periodStart,
          periodEnd: periodEnd || null,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await this.findSubByStripe({
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId:
          typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
      });
      if (sub) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELED', cancelAtPeriodEnd: false },
        });
        void this.notifications.notifyAdmins({
          title: 'Subscription canceled',
          body: `${sub.merchant.businessName} subscription was deleted in Stripe.`,
          href: '/admin/subscriptions',
          entityType: 'Subscription',
          entityId: sub.id,
          auditAction: 'BILLING_SUBSCRIPTION_DELETED',
        });
      }
    }

    return { received: true };
  }
}
