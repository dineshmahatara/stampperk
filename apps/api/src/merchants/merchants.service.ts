import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createMerchantSchema,
  inviteStaffSchema,
  updateMerchantProfileSchema,
  updateStaffSchema,
  customerLookupSchema,
  inviteCustomerSchema,
  phoneLookupVariants,
  applyVerificationSchema,
  isMerchantVerifiedLive,
  createCouponSchema,
  updateCouponSchema,
  redeemCouponSchema,
} from '@stampz/shared';
import { CouponType, CustomerSegment, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { allocateUniqueQrToken } from '../common/qr-token';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function parsePermissions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : ['SCAN', 'REDEEM'];
  } catch {
    return ['SCAN', 'REDEEM'];
  }
}

function parseOptionalDate(v?: string | null): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  return new Date(v.includes('T') ? v : `${v}T23:59:59.999Z`);
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

function parseReportRange(from?: string, to?: string) {
  const end = to
    ? new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`)
    : new Date();
  const start = from
    ? new Date(from.includes('T') ? from : `${from}T00:00:00.000Z`)
    : new Date(end.getTime() - 30 * 86400000);
  if (Number.isNaN(+start) || Number.isNaN(+end)) {
    throw new BadRequestException('Invalid from/to date');
  }
  if (start > end) throw new BadRequestException('from must be before to');
  return { start, end };
}

function computeCustomerSegment(input: {
  lastVisitAt: Date | null;
  joinedAt: Date;
  visitCount: number;
  spend: number;
  completedCycles: number;
  vipSpendThreshold: number;
  now?: Date;
}): CustomerSegment {
  const now = input.now ?? new Date();
  const ms30 = 30 * 86400000;
  const atRisk =
    (input.lastVisitAt != null && now.getTime() - input.lastVisitAt.getTime() > ms30) ||
    (input.lastVisitAt == null && now.getTime() - input.joinedAt.getTime() > ms30);
  if (atRisk) return CustomerSegment.AT_RISK;
  const vipBySpend =
    input.spend > 0 &&
    Number.isFinite(input.vipSpendThreshold) &&
    input.spend >= input.vipSpendThreshold;
  if (input.completedCycles >= 2 || vipBySpend) {
    return CustomerSegment.VIP;
  }
  if (now.getTime() - input.joinedAt.getTime() <= ms30 && input.visitCount <= 1) {
    return CustomerSegment.NEW;
  }
  return input.visitCount >= 2 ? CustomerSegment.RETURNING : CustomerSegment.NEW;
}

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pricingCatalog: PricingCatalogService,
  ) {}

  async create(ownerId: string, raw: unknown, preferredPlanMerchantId?: string) {
    const data = createMerchantSchema.parse(raw);
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('User not found');
    if (owner.role !== UserRole.MERCHANT_OWNER && owner.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only merchants can create a business');
    }

    const owned = await this.prisma.merchant.findMany({
      where: { ownerId },
      include: { subscription: true },
      orderBy: { createdAt: 'asc' },
    });
    const planSource =
      (preferredPlanMerchantId ? owned.find((m) => m.id === preferredPlanMerchantId) : null) ||
      owned[0];
    const plan = planSource?.subscription?.plan ?? 'FREE';
    const limits = this.effectivePlanLimits(planSource?.subscription || null, plan);
    if (owned.length >= limits.businesses) {
      throw new ForbiddenException(
        `Business profile limit reached for ${plan} plan (${limits.businesses}). Upgrade to add more.`,
      );
    }

    let slug = slugify(data.businessName);
    const clash = await this.prisma.merchant.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;

    const isFirst = owned.length === 0;
    const trialEndsAt = isFirst ? new Date(Date.now() + 14 * 86400000) : null;

    const merchant = await this.prisma.$transaction(async (tx) => {
      if (owner.role !== UserRole.MERCHANT_OWNER) {
        await tx.user.update({ where: { id: ownerId }, data: { role: UserRole.MERCHANT_OWNER } });
      }
      const m = await tx.merchant.create({
        data: {
          ownerId,
          businessName: data.businessName,
          slug,
          category: data.category,
          description: data.description,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          logoUrl: data.logoUrl,
          timezone: data.timezone,
          currency: data.currency,
          status: 'ACTIVE',
          branches: { create: { name: 'Main', address: data.address, latitude: data.latitude, longitude: data.longitude } },
          subscription: {
            create: {
              plan: owned.length ? plan : 'FREE',
              status: isFirst ? 'TRIALING' : 'ACTIVE',
              provider: 'MANUAL',
              trialEndsAt,
            },
          },
        },
        include: { branches: true, subscription: true },
      });
      return m;
    });

    void this.notifications.notifyAdmins({
      title: 'New merchant signup',
      body: `${merchant.businessName} signed up (${merchant.subscription?.status || 'ACTIVE'}).`,
      href: '/admin/merchants',
      entityType: 'Merchant',
      entityId: merchant.id,
      actorUserId: ownerId,
      auditAction: 'MERCHANT_SIGNUP',
    });

    return merchant;
  }

  /** Base plan limits plus purchased seat add-ons. */
  effectivePlanLimits(
    sub: { plan?: string; extraBranches?: number; extraStaff?: number } | null,
    planFallback = 'FREE',
  ) {
    return this.pricingCatalog.effectivePlanLimits({
      plan: sub?.plan || planFallback,
      extraBranches: sub?.extraBranches,
      extraStaff: sub?.extraStaff,
    });
  }

  async listMine(userId: string) {
    return this.prisma.merchant.findMany({
      where: {
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMine(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ...(merchantId ? { id: merchantId } : {}),
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
      include: {
        branches: true,
        subscription: true,
        loyaltyPrograms: { where: { active: true } },
        gallery: { orderBy: { sortOrder: 'asc' } },
        menuItems: true,
        publicLinks: true,
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true, photoUrl: true } },
            branch: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async updateMine(userId: string, body: unknown, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const data = updateMerchantProfileSchema.parse(body);
    const emptyToNull = (v: string | undefined) => (v === '' ? null : v);

    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        businessName: data.businessName,
        category: data.category,
        description: emptyToNull(data.description),
        tagline: emptyToNull(data.tagline),
        logoUrl: emptyToNull(data.logoUrl),
        registrationNumber: emptyToNull(data.registrationNumber),
        panVatNumber: emptyToNull(data.panVatNumber),
        businessType: emptyToNull(data.businessType),
        yearEstablished: data.yearEstablished === undefined ? undefined : data.yearEstablished,
        contactPerson: emptyToNull(data.contactPerson),
        designation: emptyToNull(data.designation),
        phone: emptyToNull(data.phone),
        mobile: emptyToNull(data.mobile),
        supportPhone: emptyToNull(data.supportPhone),
        email: emptyToNull(data.email),
        website: emptyToNull(data.website),
        whatsapp: emptyToNull(data.whatsapp),
        address: emptyToNull(data.address),
        province: emptyToNull(data.province),
        district: emptyToNull(data.district),
        city: emptyToNull(data.city),
        municipality: emptyToNull(data.municipality),
        ward: emptyToNull(data.ward),
        postalCode: emptyToNull(data.postalCode),
        country: emptyToNull(data.country) ?? undefined,
        latitude: data.latitude === undefined ? undefined : data.latitude,
        longitude: data.longitude === undefined ? undefined : data.longitude,
        googleMapsUrl: emptyToNull(data.googleMapsUrl),
        facebook: emptyToNull(data.facebook),
        instagram: emptyToNull(data.instagram),
        linkedin: emptyToNull(data.linkedin),
        tiktok: emptyToNull(data.tiktok),
        youtube: emptyToNull(data.youtube),
        twitter: emptyToNull(data.twitter),
        pinterest: emptyToNull(data.pinterest),
        threads: emptyToNull(data.threads),
        hoursJson: data.hoursJson as Prisma.InputJsonValue | undefined,
        deliveryNote: emptyToNull(data.deliveryNote),
        supportNote: emptyToNull(data.supportNote),
        deliveryEnabled: data.deliveryEnabled,
        timezone: emptyToNull(data.timezone) ?? undefined,
        currency: emptyToNull(data.currency) ?? undefined,
      },
      include: { branches: true, subscription: true },
    });
  }

  async dashboard(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalCustomers,
      stampsWeek,
      redemptionsWeek,
      stampsPrevWeek,
      redemptionsPrevWeek,
      customersPrevWeek,
      recentStamps,
      recentRedemptions,
      pendingRewards,
      salesAgg,
      programs,
      topCards,
    ] = await Promise.all([
      this.prisma.loyaltyCard.count({
        where: { program: { merchantId: merchant.id }, customer: { deletedAt: null } },
      }),
      this.prisma.stamp.count({
        where: { merchantId: merchant.id, createdAt: { gte: weekAgo }, customer: { deletedAt: null } },
      }),
      this.prisma.redemption.count({
        where: { merchantId: merchant.id, createdAt: { gte: weekAgo }, customer: { deletedAt: null } },
      }),
      this.prisma.stamp.count({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
          customer: { deletedAt: null },
        },
      }),
      this.prisma.redemption.count({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
          customer: { deletedAt: null },
        },
      }),
      this.prisma.loyaltyCard.count({
        where: {
          program: { merchantId: merchant.id },
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
          customer: { deletedAt: null },
        },
      }),
      this.prisma.stamp.findMany({
        where: { merchantId: merchant.id, customer: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: { select: { id: true, name: true } }, program: true },
      }),
      this.prisma.redemption.findMany({
        where: { merchantId: merchant.id, customer: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: { select: { id: true, name: true } } },
      }),
      this.prisma.loyaltyCard.aggregate({
        where: {
          program: { merchantId: merchant.id },
          availableRewards: { gt: 0 },
          customer: { deletedAt: null },
        },
        _sum: { availableRewards: true },
        _count: { id: true },
      }),
      this.prisma.stamp.aggregate({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: weekAgo },
          saleAmount: { not: null },
          customer: { deletedAt: null },
        },
        _sum: { saleAmount: true },
      }),
      this.prisma.loyaltyProgram.findMany({
        where: { merchantId: merchant.id },
        include: { _count: { select: { cards: true, stamps: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loyaltyCard.findMany({
        where: { program: { merchantId: merchant.id }, customer: { deletedAt: null } },
        orderBy: { stampCount: 'desc' },
        take: 8,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          program: { select: { title: true } },
          stamps: { select: { saleAmount: true } },
        },
      }),
    ]);

    const customersThisWeek = await this.prisma.loyaltyCard.count({
      where: {
        program: { merchantId: merchant.id },
        createdAt: { gte: weekAgo },
        customer: { deletedAt: null },
      },
    });

    const returning = await this.prisma.loyaltyCard.count({
      where: {
        program: { merchantId: merchant.id },
        stampCount: { gt: 1 },
        customer: { deletedAt: null },
      },
    });

    const seriesStart = new Date();
    seriesStart.setHours(0, 0, 0, 0);
    seriesStart.setDate(seriesStart.getDate() - 6);
    const weekStamps = await this.prisma.stamp.findMany({
      where: { merchantId: merchant.id, createdAt: { gte: seriesStart } },
      select: { createdAt: true },
    });
    const stampSeries: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      stampSeries.push({
        label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: weekStamps.filter((s) => s.createdAt.toISOString().slice(0, 10) === key).length,
      });
    }

    const pct = (curr: number, prev: number) => {
      if (!prev) return curr ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const programCardsTotal = programs.reduce((s, p) => s + p._count.cards, 0) || 1;
    const programPerformance = programs
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        title: p.title,
        rewardTitle: p.rewardTitle,
        cards: p._count.cards,
        stamps: p._count.stamps,
        totalStamps: p.totalStamps,
        percent: Math.round((p._count.cards / programCardsTotal) * 1000) / 10,
        progress: Math.min(100, Math.round((p._count.stamps / Math.max(p._count.cards * p.totalStamps, 1)) * 100)),
      }));

    const topCustomers = topCards.map((c) => ({
      id: c.id,
      name: c.customer.name,
      email: c.customer.email,
      stamps: c.stampCount,
      programTitle: c.program.title,
      spend: c.stamps.reduce((s, x) => s + (x.saleAmount || 0), 0),
    }));

    const currency = merchant.currency || 'NPR';
    const salesWeek = salesAgg._sum.saleAmount || 0;

    return {
      merchantId: merchant.id,
      businessName: merchant.businessName,
      slug: merchant.slug,
      logoUrl: merchant.logoUrl,
      city: merchant.city,
      country: merchant.country,
      category: merchant.category,
      currency,
      plan: merchant.subscription?.plan ?? 'FREE',
      planDisplayName: this.effectivePlanLimits(merchant.subscription).displayName,
      subscriptionStatus: merchant.subscription?.status ?? 'ACTIVE',
      periodEnd: merchant.subscription?.currentPeriodEnd ?? null,
      trialEndsAt: merchant.subscription?.trialEndsAt ?? null,
      limits: this.effectivePlanLimits(merchant.subscription),
      extraBranches: merchant.subscription?.extraBranches ?? 0,
      extraStaff: merchant.subscription?.extraStaff ?? 0,
      kpis: {
        totalCustomers,
        stampsGivenWeek: stampsWeek,
        rewardsRedeemedWeek: redemptionsWeek,
        returningCustomers: returning,
        returningRate: totalCustomers ? Math.round((returning / totalCustomers) * 100) : 0,
        salesWeek,
        pendingRedemptions: pendingRewards._sum.availableRewards || 0,
        pendingCards: pendingRewards._count.id || 0,
      },
      trends: {
        customers: pct(customersThisWeek, customersPrevWeek),
        stamps: pct(stampsWeek, stampsPrevWeek),
        redemptions: pct(redemptionsWeek, redemptionsPrevWeek),
        sales: pct(salesWeek, 0),
      },
      stampSeries,
      programPerformance,
      activePrograms: programPerformance,
      topCustomers,
      recentStamps: recentStamps.map((s) => ({
        id: s.id,
        customerName: s.customer.name,
        programTitle: s.program.title,
        stamps: 1,
        at: s.createdAt,
      })),
      recentActivity: [
        ...recentStamps.map((s) => ({
          type: 'stamp' as const,
          id: s.id,
          customerName: s.customer.name,
          programTitle: s.program.title,
          at: s.createdAt,
        })),
        ...recentRedemptions.map((r) => ({
          type: 'redemption' as const,
          id: r.id,
          customerName: r.customer.name,
          rewardTitle: r.rewardTitle,
          at: r.createdAt,
        })),
      ]
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 15),
    };
  }

  async inviteStaff(ownerId: string, raw: unknown, merchantId?: string) {
    const data = inviteStaffSchema.parse(raw);
    const merchant = await this.requireOwner(ownerId, merchantId);
    const limits = this.effectivePlanLimits(merchant.subscription);
    const activeStaff = merchant.staff.filter((s) => s.active).length;
    if (activeStaff >= limits.staff) {
      throw new ForbiddenException(
        `Staff limit reached for ${limits.displayName || 'plan'} (${limits.staff}). Upgrade or buy add-ons.`,
      );
    }

    let user = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      const passwordHash = await bcrypt.hash('Stampz123!', 10);
      const qrToken = await allocateUniqueQrToken(this.prisma);
      user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: UserRole.STAFF,
          qrToken,
        },
      });
    } else if (user.role === UserRole.CUSTOMER) {
      await this.prisma.user.update({ where: { id: user.id }, data: { role: UserRole.STAFF } });
    }

    const membership = await this.prisma.staffMember.upsert({
      where: { merchantId_userId: { merchantId: merchant.id, userId: user.id } },
      create: {
        merchantId: merchant.id,
        userId: user.id,
        branchId: data.branchId,
        permissions: JSON.stringify(data.permissions),
        acceptedAt: new Date(),
      },
      update: {
        permissions: JSON.stringify(data.permissions),
        branchId: data.branchId,
        active: true,
      },
      include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
    });

    return {
      ...membership,
      permissions: parsePermissions(membership.permissions),
    };
  }

  async updateStaff(ownerId: string, staffId: string, raw: unknown, merchantId?: string) {
    const data = updateStaffSchema.parse(raw);
    const merchant = await this.requireOwner(ownerId, merchantId);
    const existing = await this.prisma.staffMember.findFirst({
      where: { id: staffId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Staff not found');
    const membership = await this.prisma.staffMember.update({
      where: { id: staffId },
      data: {
        active: data.active,
        permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
        branchId: data.branchId === undefined ? undefined : data.branchId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
        branch: true,
      },
    });
    return {
      ...membership,
      permissions: parsePermissions(membership.permissions),
    };
  }

  async removeStaff(ownerId: string, staffId: string, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const existing = await this.prisma.staffMember.findFirst({
      where: { id: staffId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Staff not found');
    await this.prisma.staffMember.update({
      where: { id: staffId },
      data: { active: false },
    });
    return { ok: true };
  }

  async addBranch(ownerId: string, body: { name: string; address?: string; phone?: string; latitude?: number; longitude?: number }, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const limits = this.effectivePlanLimits(merchant.subscription);
    if (merchant.branches.length >= limits.branches) {
      throw new ForbiddenException(
        `Branch limit reached for ${limits.displayName || 'plan'} (${limits.branches}). Upgrade or buy add-ons.`,
      );
    }
    return this.prisma.branch.create({
      data: {
        merchantId: merchant.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
        latitude: body.latitude,
        longitude: body.longitude,
      },
    });
  }

  async updateBranch(
    ownerId: string,
    branchId: string,
    body: {
      name?: string;
      address?: string | null;
      phone?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
    merchantId?: string,
  ) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const existing = await this.prisma.branch.findFirst({
      where: { id: branchId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Branch not found');

    const clearable = (v: string | null | undefined) => {
      if (v === undefined) return undefined;
      return v === '' ? null : v;
    };

    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        name: body.name === undefined ? undefined : body.name.trim() || existing.name,
        address: clearable(body.address),
        phone: clearable(body.phone),
        latitude: body.latitude === undefined ? undefined : body.latitude,
        longitude: body.longitude === undefined ? undefined : body.longitude,
      },
    });
  }

  async removeBranch(ownerId: string, branchId: string, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const existing = await this.prisma.branch.findFirst({
      where: { id: branchId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Branch not found');

    await this.prisma.staffMember.updateMany({
      where: { merchantId: merchant.id, branchId },
      data: { branchId: null },
    });

    await this.prisma.branch.delete({ where: { id: branchId } });
    return { ok: true };
  }

  async addGalleryPhoto(ownerId: string, url: string, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const limits = this.effectivePlanLimits(merchant.subscription);
    const count = await this.prisma.galleryPhoto.count({ where: { merchantId: merchant.id } });
    if (count >= limits.galleryPhotos) {
      throw new ForbiddenException('Gallery photo limit reached for your plan');
    }
    return this.prisma.galleryPhoto.create({
      data: { merchantId: merchant.id, url, sortOrder: count },
    });
  }

  async addMenuItem(ownerId: string, body: { name: string; description?: string; price?: number; imageUrl?: string }, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const count = await this.prisma.menuItem.count({ where: { merchantId: merchant.id } });
    if (count >= 10) throw new BadRequestException('Max 10 menu items');
    return this.prisma.menuItem.create({
      data: { merchantId: merchant.id, ...body },
    });
  }

  async addPublicLink(ownerId: string, body: { label: string; url: string }, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const count = await this.prisma.publicLink.count({ where: { merchantId: merchant.id } });
    if (count >= 12) throw new BadRequestException('Max 12 public links');
    return this.prisma.publicLink.create({
      data: { merchantId: merchant.id, ...body },
    });
  }

  async addSalesAdjustment(ownerId: string, body: { amount: number; reason: string }, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    return this.prisma.salesAdjustment.create({
      data: { merchantId: merchant.id, amount: body.amount, reason: body.reason },
    });
  }

  async addSavingsAdjustment(ownerId: string, body: { amount: number; reason: string }, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    return this.prisma.savingsAdjustment.create({
      data: { merchantId: merchant.id, amount: body.amount, reason: body.reason },
    });
  }

  async getBySlug(slug: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        loyaltyPrograms: { where: { active: true } },
        campaigns: { where: { status: 'ACTIVE' }, take: 10 },
        gallery: { orderBy: { sortOrder: 'asc' } },
        menuItems: true,
        publicLinks: true,
        branches: true,
        subscription: {
          select: { verifiedAddon: true, verifiedUntil: true },
        },
      },
    });
    if (!merchant) throw new NotFoundException('Business not found');
    const verified = isMerchantVerifiedLive({
      verificationStatus: merchant.verificationStatus,
      verifiedAddon: merchant.subscription?.verifiedAddon,
      verifiedUntil: merchant.subscription?.verifiedUntil,
    });
    return { ...merchant, verified };
  }

  async getVerification(ownerId: string, merchantId?: string) {
    const merchant = await this.requireOwner(ownerId, merchantId);
    const full = await this.prisma.merchant.findUnique({
      where: { id: merchant.id },
      include: {
        subscription: {
          select: {
            verifiedAddon: true,
            verifiedUntil: true,
            plan: true,
            status: true,
          },
        },
      },
    });
    if (!full) throw new NotFoundException('Merchant not found');
    const verified = isMerchantVerifiedLive({
      verificationStatus: full.verificationStatus,
      verifiedAddon: full.subscription?.verifiedAddon,
      verifiedUntil: full.subscription?.verifiedUntil,
    });
    return {
      merchantId: full.id,
      businessName: full.businessName,
      verificationStatus: full.verificationStatus,
      verifiedAt: full.verifiedAt,
      verificationReviewedAt: full.verificationReviewedAt,
      verificationNote: full.verificationNote,
      verificationDocUrls: full.verificationDocUrls,
      registrationNumber: full.registrationNumber,
      panVatNumber: full.panVatNumber,
      verifiedAddon: full.subscription?.verifiedAddon ?? false,
      verifiedUntil: full.subscription?.verifiedUntil ?? null,
      verified,
      canPay: full.verificationStatus === 'APPROVED',
      canApply:
        full.verificationStatus === 'NONE' ||
        full.verificationStatus === 'REJECTED' ||
        full.verificationStatus === 'REVOKED',
    };
  }

  async applyVerification(ownerId: string, body: unknown, merchantId?: string) {
    const data = applyVerificationSchema.parse(body);
    const merchant = await this.requireOwner(ownerId, merchantId);
    if (
      merchant.verificationStatus === 'PENDING' ||
      merchant.verificationStatus === 'APPROVED'
    ) {
      throw new BadRequestException(
        merchant.verificationStatus === 'PENDING'
          ? 'Verification already pending review'
          : 'Already approved — pay or renew the Verified add-on from Billing',
      );
    }
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        verificationStatus: 'PENDING',
        verificationDocUrls: data.docUrls,
        registrationNumber: data.registrationNumber ?? merchant.registrationNumber,
        panVatNumber: data.panVatNumber ?? merchant.panVatNumber,
        verificationNote: data.note || null,
        verificationReviewedAt: null,
        verifiedAt: null,
      },
      select: {
        id: true,
        verificationStatus: true,
        verificationDocUrls: true,
        registrationNumber: true,
        panVatNumber: true,
      },
    }).then(async (row) => {
      void this.notifications.notifyAdmins({
        title: 'Verified Badge application',
        body: `${merchant.businessName} submitted documents for review.`,
        href: '/admin/verifications',
        entityType: 'Merchant',
        entityId: merchant.id,
        actorUserId: ownerId,
        auditAction: 'VERIFICATION_PENDING',
      });
      return row;
    });
  }

  async listCustomers(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const cards = await this.prisma.loyaltyCard.findMany({
      where: {
        program: { merchantId: merchant.id },
        customer: { deletedAt: null },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            createdAt: true,
            dateOfBirth: true,
          },
        },
        program: { select: { title: true, totalStamps: true, rewardTitle: true } },
        stamps: { select: { saleAmount: true, createdAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const enriched = cards.map((c) => {
      const spend = c.stamps.reduce((s, x) => s + (x.saleAmount || 0), 0);
      const lastVisitAt =
        c.stamps.length > 0
          ? c.stamps.reduce(
              (max, s) => (s.createdAt > max ? s.createdAt : max),
              c.stamps[0].createdAt,
            )
          : null;
      const distinctDays = new Set(c.stamps.map((s) => dayKey(s.createdAt)));
      const visitCount = distinctDays.size || c.stampCount;
      return {
        card: c,
        spend,
        lastVisitAt,
        visitCount,
      };
    });

    const spends = enriched.map((e) => e.spend).sort((a, b) => a - b);
    const vipSpendThreshold =
      spends.length === 0 ? Number.POSITIVE_INFINITY : spends[Math.floor(spends.length * 0.75)] ?? spends[spends.length - 1];

    return enriched.map(({ card: c, spend, lastVisitAt, visitCount }) => {
      const segment = computeCustomerSegment({
        lastVisitAt,
        joinedAt: c.createdAt,
        visitCount,
        spend,
        completedCycles: c.completedCycles,
        vipSpendThreshold,
      });
      return {
        id: c.id,
        customerId: c.customer.id,
        name: c.customer.name,
        email: c.customer.email,
        photoUrl: c.customer.photoUrl,
        dateOfBirth: c.customer.dateOfBirth,
        joinedAt: c.createdAt,
        stampCount: c.stampCount,
        visitCount,
        lastVisitAt,
        completedCycles: c.completedCycles,
        availableRewards: c.availableRewards,
        programTitle: c.program.title,
        totalStamps: c.program.totalStamps,
        rewardTitle: c.program.rewardTitle,
        spend,
        segment,
      };
    });
  }

  async listCoupons(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    return this.prisma.coupon.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { redemptions: true } },
      },
    });
  }

  async createCoupon(userId: string, raw: unknown, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const data = createCouponSchema.parse(raw);
    const code = data.code.trim().toUpperCase();
    if (data.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: data.branchId, merchantId: merchant.id },
      });
      if (!branch) throw new BadRequestException('Invalid branch');
    }
    try {
      return await this.prisma.coupon.create({
        data: {
          merchantId: merchant.id,
          code,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          type: data.type as CouponType,
          value: data.value,
          expiresAt: parseOptionalDate(data.expiresAt) ?? null,
          usageLimit: data.usageLimit ?? null,
          branchId: data.branchId ?? null,
          segment: (data.segment || 'ALL') as CustomerSegment,
          active: data.active ?? true,
        },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { redemptions: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Coupon code already exists');
      }
      throw e;
    }
  }

  async updateCoupon(userId: string, couponId: string, raw: unknown, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const existing = await this.prisma.coupon.findFirst({
      where: { id: couponId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    const data = updateCouponSchema.parse(raw);
    if (data.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: data.branchId, merchantId: merchant.id },
      });
      if (!branch) throw new BadRequestException('Invalid branch');
    }
    try {
      return await this.prisma.coupon.update({
        where: { id: couponId },
        data: {
          code: data.code === undefined ? undefined : data.code.trim().toUpperCase(),
          title: data.title === undefined ? undefined : data.title.trim(),
          description:
            data.description === undefined ? undefined : data.description?.trim() || null,
          type: data.type as CouponType | undefined,
          value: data.value,
          expiresAt: data.expiresAt === undefined ? undefined : parseOptionalDate(data.expiresAt),
          usageLimit: data.usageLimit === undefined ? undefined : data.usageLimit,
          branchId: data.branchId === undefined ? undefined : data.branchId,
          segment: data.segment as CustomerSegment | undefined,
          active: data.active,
        },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { redemptions: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Coupon code already exists');
      }
      throw e;
    }
  }

  async redeemCoupon(userId: string, raw: unknown, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const data = redeemCouponSchema.parse(raw);
    const code = data.code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findFirst({
      where: { merchantId: merchant.id, code },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.active) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    let customer =
      data.customerId
        ? await this.prisma.user.findFirst({
            where: { id: data.customerId, deletedAt: null },
            select: { id: true, name: true, email: true, dateOfBirth: true },
          })
        : null;
    if (!customer && data.email) {
      customer = await this.prisma.user.findFirst({
        where: { email: data.email.trim().toLowerCase(), deletedAt: null },
        select: { id: true, name: true, email: true, dateOfBirth: true },
      });
    }
    if (!customer) throw new NotFoundException('Customer not found');

    const already = await this.prisma.couponRedemption.findFirst({
      where: { couponId: coupon.id, customerId: customer.id },
    });
    if (already) throw new BadRequestException('Customer already redeemed this coupon');

    if (coupon.segment !== CustomerSegment.ALL) {
      const cards = await this.listCustomers(userId, merchant.id);
      const matches = cards.filter((c) => c.customerId === customer!.id);
      if (!matches.length || !matches.some((c) => c.segment === coupon.segment)) {
        throw new BadRequestException(`Coupon is limited to ${coupon.segment} customers`);
      }
    }

    const redemption = await this.prisma.$transaction(async (tx) => {
      const row = await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          merchantId: merchant.id,
          customerId: customer!.id,
        },
        include: {
          coupon: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      });
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
      return row;
    });

    return redemption;
  }

  async reportCustomersCsv(userId: string, from?: string, to?: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const { start, end } = parseReportRange(from, to);
    const rows = await this.listCustomers(userId, merchant.id);
    const filtered = rows.filter((r) => {
      const joined = new Date(r.joinedAt);
      return joined >= start && joined <= end;
    });
    const csv = toCsv(
      [
        'customerId',
        'name',
        'email',
        'segment',
        'joinedAt',
        'lastVisitAt',
        'visitCount',
        'stampCount',
        'spend',
        'completedCycles',
        'programTitle',
        'dateOfBirth',
      ],
      filtered.map((r) => [
        r.customerId,
        r.name,
        r.email,
        r.segment,
        r.joinedAt?.toISOString?.() ?? r.joinedAt,
        r.lastVisitAt?.toISOString?.() ?? r.lastVisitAt ?? '',
        r.visitCount,
        r.stampCount,
        r.spend,
        r.completedCycles,
        r.programTitle,
        r.dateOfBirth?.toISOString?.() ?? r.dateOfBirth ?? '',
      ]),
    );
    return { csv, count: filtered.length, from: start.toISOString(), to: end.toISOString() };
  }

  async reportStampsCsv(userId: string, from?: string, to?: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const { start, end } = parseReportRange(from, to);
    const stamps = await this.prisma.stamp.findMany({
      where: {
        merchantId: merchant.id,
        createdAt: { gte: start, lte: end },
        customer: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        program: { select: { title: true } },
        issuedBy: { select: { name: true } },
      },
    });
    const csv = toCsv(
      ['stampId', 'customerName', 'customerEmail', 'programTitle', 'issuedBy', 'saleAmount', 'createdAt'],
      stamps.map((s) => [
        s.id,
        s.customer.name,
        s.customer.email,
        s.program.title,
        s.issuedBy.name,
        s.saleAmount ?? '',
        s.createdAt.toISOString(),
      ]),
    );
    return { csv, count: stamps.length, from: start.toISOString(), to: end.toISOString() };
  }

  async reportRedemptionsCsv(userId: string, from?: string, to?: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const { start, end } = parseReportRange(from, to);
    const [rewardReds, couponReds] = await Promise.all([
      this.prisma.redemption.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: start, lte: end },
          customer: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, email: true } } },
      }),
      this.prisma.couponRedemption.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: start, lte: end },
          customer: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
          coupon: { select: { code: true, title: true } },
        },
      }),
    ]);
    const csv = toCsv(
      ['type', 'id', 'customerName', 'customerEmail', 'detail', 'savingsOrCode', 'createdAt'],
      [
        ...rewardReds.map((r) => [
          'reward',
          r.id,
          r.customer.name,
          r.customer.email,
          r.rewardTitle,
          r.estimatedSavings ?? '',
          r.createdAt.toISOString(),
        ]),
        ...couponReds.map((r) => [
          'coupon',
          r.id,
          r.customer.name,
          r.customer.email,
          r.coupon.title,
          r.coupon.code,
          r.createdAt.toISOString(),
        ]),
      ],
    );
    return {
      csv,
      count: rewardReds.length + couponReds.length,
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }

  async reportCampaignsCsv(userId: string, from?: string, to?: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const { start, end } = parseReportRange(from, to);
    const campaigns = await this.prisma.campaign.findMany({
      where: { merchantId: merchant.id, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
    });
    const csv = toCsv(
      [
        'campaignId',
        'title',
        'status',
        'offerType',
        'discountValue',
        'views',
        'clicks',
        'startsAt',
        'endsAt',
        'createdAt',
      ],
      campaigns.map((c) => [
        c.id,
        c.title,
        c.status,
        c.offerType,
        c.discountValue ?? '',
        c.views,
        c.clicks,
        c.startsAt?.toISOString() ?? '',
        c.endsAt?.toISOString() ?? '',
        c.createdAt.toISOString(),
      ]),
    );
    return { csv, count: campaigns.length, from: start.toISOString(), to: end.toISOString() };
  }

  async analyticsDeep(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d90 = new Date(now.getTime() - 90 * 86400000);

    const [
      stampsDaily,
      stampsWeekly,
      stampsMonthly,
      redemptions30,
      members,
      cards,
      topRewards,
      staffStamps,
      campaigns,
      couponRedeems,
      spend30,
      customers,
      staffMembers,
    ] = await Promise.all([
      this.prisma.stamp.count({ where: { merchantId: merchant.id, createdAt: { gte: d7 } } }),
      this.prisma.stamp.count({ where: { merchantId: merchant.id, createdAt: { gte: d30 } } }),
      this.prisma.stamp.count({ where: { merchantId: merchant.id, createdAt: { gte: d90 } } }),
      this.prisma.redemption.count({
        where: { merchantId: merchant.id, createdAt: { gte: d30 } },
      }),
      this.prisma.loyaltyCard.count({
        where: {
          program: { merchantId: merchant.id },
          stampCount: { gt: 0 },
          customer: { deletedAt: null },
        },
      }),
      this.prisma.loyaltyCard.findMany({
        where: { program: { merchantId: merchant.id }, customer: { deletedAt: null } },
        select: {
          createdAt: true,
          stampCount: true,
          stamps: { select: { createdAt: true, saleAmount: true } },
        },
        take: 2000,
      }),
      this.prisma.redemption.groupBy({
        by: ['rewardTitle'],
        where: { merchantId: merchant.id },
        _count: { rewardTitle: true },
        orderBy: { _count: { rewardTitle: 'desc' } },
        take: 8,
      }),
      this.prisma.stamp.groupBy({
        by: ['issuedById'],
        where: { merchantId: merchant.id },
        _count: { issuedById: true },
        orderBy: { _count: { issuedById: 'desc' } },
        take: 8,
      }),
      this.prisma.campaign.findMany({
        where: { merchantId: merchant.id },
        select: { id: true, title: true, views: true, clicks: true, status: true },
        take: 20,
      }),
      this.prisma.couponRedemption.count({
        where: { merchantId: merchant.id, createdAt: { gte: d30 } },
      }),
      this.prisma.stamp.aggregate({
        where: { merchantId: merchant.id, createdAt: { gte: d30 }, saleAmount: { not: null } },
        _sum: { saleAmount: true },
      }),
      this.listCustomers(userId, merchant.id),
      this.prisma.staffMember.findMany({
        where: { merchantId: merchant.id, active: true },
        select: {
          userId: true,
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    const staffIds = staffStamps.map((s) => s.issuedById).filter(Boolean);
    const staffUsers = staffIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const staffMap = Object.fromEntries(staffUsers.map((u) => [u.id, u.name]));
    const staffBranch = Object.fromEntries(
      staffMembers.filter((s) => s.branch).map((s) => [s.userId, s.branch!]),
    );
    const branchCounts = new Map<string, { name: string; stamps: number }>();
    for (const s of staffStamps) {
      const br = staffBranch[s.issuedById];
      if (!br) continue;
      const prev = branchCounts.get(br.id);
      branchCounts.set(br.id, {
        name: br.name,
        stamps: (prev?.stamps || 0) + (s._count.issuedById || 0),
      });
    }

    const newCount = customers.filter((c) => c.segment === 'NEW').length;
    const returningCount = customers.filter((c) => c.segment === 'RETURNING' || c.segment === 'VIP').length;
    const atRisk = customers.filter((c) => c.segment === 'AT_RISK').length;
    const retentionProxy =
      members > 0 ? Math.round(((members - atRisk) / Math.max(members, 1)) * 1000) / 10 : 0;

    const seriesMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      seriesMap.set(key, 0);
    }
    for (const c of cards) {
      for (const s of c.stamps) {
        const key = s.createdAt.toISOString().slice(0, 10);
        if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) || 0) + 1);
      }
    }

    return {
      stamps: { daily7: stampsDaily, weekly30: stampsWeekly, monthly90: stampsMonthly },
      redemptionRate:
        stampsWeekly > 0 ? Math.round((redemptions30 / stampsWeekly) * 1000) / 10 : 0,
      activeMembers: members,
      newVsReturning: { new: newCount, returning: returningCount, atRisk },
      topRewards: topRewards.map((r) => ({ title: r.rewardTitle, count: r._count.rewardTitle })),
      topBranches: [...branchCounts.entries()]
        .sort((a, b) => b[1].stamps - a[1].stamps)
        .slice(0, 8)
        .map(([id, v]) => ({ id, name: v.name, stamps: v.stamps })),
      staffPerformance: staffStamps.map((s) => ({
        id: s.issuedById,
        name: staffMap[s.issuedById] || 'Staff',
        stamps: s._count.issuedById,
      })),
      campaignConversion: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        views: c.views,
        clicks: c.clicks,
        ctr: c.views ? Math.round((c.clicks / c.views) * 1000) / 10 : 0,
      })),
      couponRedemptions30: couponRedeems,
      retentionProxy,
      loyaltyAttributedSpend30: spend30._sum.saleAmount || 0,
      stampSeries: [...seriesMap.entries()].map(([label, count]) => ({ label, count })),
    };
  }

  private customerPublic(u: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    qrToken: string;
  }) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      qrToken: u.qrToken,
      qrPayload: `stampz:customer:${u.qrToken}`,
    };
  }

  async lookupCustomer(
    userId: string,
    query: { email?: string; phone?: string },
    merchantId?: string,
  ) {
    await this.getAccessibleMerchant(userId, merchantId);
    const data = customerLookupSchema.parse(query);
    const select = {
      id: true,
      name: true,
      email: true,
      phone: true,
      qrToken: true,
      role: true,
    } as const;

    let user = null as null | {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      qrToken: string;
      role: UserRole;
    };

    if (data.email) {
      user = await this.prisma.user.findFirst({
        where: { email: data.email.trim().toLowerCase(), deletedAt: null },
        select,
      });
    } else if (data.phone) {
      const variants = phoneLookupVariants(data.phone);
      user = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { phone: { in: variants } },
            { alternatePhone: { in: variants } },
          ],
        },
        select,
      });
    }

    if (!user) return { found: false as const, customer: null };
    if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.STAFF) {
      // Still allow stamping any account that has a QR (edge: merchant owner as customer)
    }
    return { found: true as const, customer: this.customerPublic(user) };
  }

  async inviteCustomer(userId: string, raw: unknown, merchantId?: string) {
    await this.getAccessibleMerchant(userId, merchantId);
    const data = inviteCustomerSchema.parse(raw);
    const email = data.email?.trim().toLowerCase();
    const phone = data.phone?.trim() || undefined;
    const select = {
      id: true,
      name: true,
      email: true,
      phone: true,
      qrToken: true,
    } as const;

    if (email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
        select,
      });
      if (existing) {
        if (phone && !existing.phone) {
          const updated = await this.prisma.user.update({
            where: { id: existing.id },
            data: { phone },
            select,
          });
          return { created: false, customer: this.customerPublic(updated) };
        }
        return { created: false, customer: this.customerPublic(existing) };
      }
    }

    if (phone) {
      const variants = phoneLookupVariants(phone);
      const byPhone = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [{ phone: { in: variants } }, { alternatePhone: { in: variants } }],
        },
        select,
      });
      if (byPhone) {
        return { created: false, customer: this.customerPublic(byPhone) };
      }
    }

    const digits = (phone || '').replace(/\D/g, '') || String(Date.now());
    const finalEmail = email || `p${digits}@phone.stampz.app`;
    const name =
      data.name?.trim() ||
      (email ? email.split('@')[0] : `Customer ${digits.slice(-4)}`);
    const passwordHash = await bcrypt.hash('Stampz123!', 10);
    const qrToken = await allocateUniqueQrToken(this.prisma);

    try {
      const created = await this.prisma.user.create({
        data: {
          email: finalEmail,
          name,
          passwordHash,
          role: UserRole.CUSTOMER,
          phone: phone || null,
          qrToken,
        },
        select,
      });
      return { created: true, customer: this.customerPublic(created) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.user.findFirst({
          where: { email: finalEmail, deletedAt: null },
          select,
        });
        if (again) return { created: false, customer: this.customerPublic(again) };
      }
      throw e;
    }
  }

  async listStamps(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    return this.prisma.stamp.findMany({
      where: { merchantId: merchant.id, customer: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        customer: { select: { name: true, email: true } },
        program: { select: { title: true } },
        issuedBy: { select: { name: true } },
      },
    });
  }

  async listRedemptions(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    return this.prisma.redemption.findMany({
      where: { merchantId: merchant.id, customer: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        customer: { select: { name: true, email: true } },
      },
    });
  }

  async listRewards(userId: string, merchantId?: string) {
    const merchant = await this.getAccessibleMerchant(userId, merchantId);
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { merchantId: merchant.id },
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return programs.map((p) => ({
      id: p.id,
      rewardTitle: p.rewardTitle,
      rewardDescription: p.rewardDescription,
      programTitle: p.title,
      totalStamps: p.totalStamps,
      active: p.active,
      cards: p._count.cards,
    }));
  }

  async requireOwner(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ownerId: userId,
        ...(merchantId ? { id: merchantId } : {}),
      },
      include: { branches: true, subscription: true, staff: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Owner access required');
    return merchant;
  }

  async getAccessibleMerchant(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ...(merchantId ? { id: merchantId } : {}),
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }
}
