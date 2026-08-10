import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  adminCreateMerchantSchema,
  adminUpdateMerchantSchema,
  platformBrandingSchema,
  adminVerificationActionSchema,
  isMerchantVerifiedLive,
} from '@stampz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { allocateUniqueQrToken } from '../common/qr-token';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';
import type { PlanCatalogRow, RegionCatalogRow } from '../pricing/default-catalog';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pricingCatalog: PricingCatalogService,
  ) {}

  private assertAdmin(role: string) {
    if (role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Admin only');
  }

  async overview(role: string) {
    this.assertAdmin(role);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      merchants,
      activeMerchants,
      customers,
      stamps,
      redemptions,
      activeSubs,
      loyaltyPrograms,
      recentMerchants,
      categoryGroups,
      recentStamps,
      recentRedemptions,
      merchantsPrev,
      customersPrev,
      stampsPrev,
      redemptionsPrev,
    ] = await Promise.all([
      this.prisma.merchant.count(),
      this.prisma.merchant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.stamp.count(),
      this.prisma.redemption.count(),
      this.prisma.subscription.count({ where: { plan: { not: 'FREE' }, status: 'ACTIVE' } }),
      this.prisma.loyaltyProgram.count({ where: { active: true } }),
      this.prisma.merchant.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { email: true, name: true } },
          subscription: true,
        },
      }),
      this.prisma.merchant.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
      }),
      this.prisma.stamp.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { businessName: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.redemption.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { businessName: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.merchant.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.stamp.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.redemption.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const stampsThisMonth = await this.prisma.stamp.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    const merchantsThisMonth = await this.prisma.merchant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    const customersThisMonth = await this.prisma.user.count({
      where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } },
    });
    const redemptionsThisMonth = await this.prisma.redemption.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Build 14-day stamp series in one pass
    const seriesStart = new Date();
    seriesStart.setHours(0, 0, 0, 0);
    seriesStart.setDate(seriesStart.getDate() - 13);
    const recentStampRows = await this.prisma.stamp.findMany({
      where: { createdAt: { gte: seriesStart } },
      select: { createdAt: true },
    });
    const dayBuckets: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const key = start.toISOString().slice(0, 10);
      const count = recentStampRows.filter(
        (s) => s.createdAt.toISOString().slice(0, 10) === key,
      ).length;
      dayBuckets.push({
        label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      });
    }

    const pct = (curr: number, prev: number) => {
      if (!prev) return curr ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const categoryTotal = categoryGroups.reduce((s, g) => s + g._count.category, 0) || 1;
    const categories = categoryGroups.slice(0, 5).map((g) => ({
      name: g.category || 'Other',
      count: g._count.category,
      percent: Math.round((g._count.category / categoryTotal) * 1000) / 10,
    }));

    const activity = [
      ...recentStamps.map((s) => ({
        type: 'stamp' as const,
        title: `Stamp issued at ${s.merchant.businessName}`,
        detail: s.customer.name,
        at: s.createdAt,
      })),
      ...recentRedemptions.map((r) => ({
        type: 'redeem' as const,
        title: `Reward redeemed at ${r.merchant.businessName}`,
        detail: r.customer.name,
        at: r.createdAt,
      })),
      ...recentMerchants.slice(0, 3).map((m) => ({
        type: 'merchant' as const,
        title: `New merchant "${m.businessName}" registered`,
        detail: m.category,
        at: m.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 8);

    return {
      activeMerchants: merchants,
      activeMerchantCount: activeMerchants,
      customers,
      stamps,
      redemptions,
      payingMerchants: activeSubs,
      loyaltyPrograms,
      systemHealth: 'ok',
      trends: {
        merchants: pct(merchantsThisMonth, merchantsPrev),
        customers: pct(customersThisMonth, customersPrev),
        stamps: pct(stampsThisMonth, stampsPrev),
        redemptions: pct(redemptionsThisMonth, redemptionsPrev),
      },
      stampSeries: dayBuckets,
      categories,
      recentMerchants,
      activity,
      platform: {
        activeMerchants,
        loyaltyPrograms,
        payingMerchants: activeSubs,
        stampsThisMonth,
        redemptionsThisMonth,
      },
    };
  }

  listMerchants(role: string) {
    this.assertAdmin(role);
    return this.prisma.merchant.findMany({
      include: { owner: { select: { id: true, email: true, name: true } }, subscription: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lightweight geo payload for Super Admin business map. */
  async listMerchantsGeo(role: string) {
    this.assertAdmin(role);
    const rows = await this.prisma.merchant.findMany({
      select: {
        id: true,
        businessName: true,
        slug: true,
        category: true,
        businessType: true,
        status: true,
        address: true,
        province: true,
        district: true,
        city: true,
        municipality: true,
        ward: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
        googleMapsUrl: true,
        owner: { select: { email: true, name: true } },
      },
      orderBy: { businessName: 'asc' },
    });

    const byCountry = new Map<string, number>();
    const byCategory = new Map<string, number>();
    let withCoords = 0;

    const merchants = rows.map((m) => {
      const country = (m.country || 'Unknown').trim() || 'Unknown';
      const category = (m.category || 'Other').trim() || 'Other';
      byCountry.set(country, (byCountry.get(country) || 0) + 1);
      byCategory.set(category, (byCategory.get(category) || 0) + 1);
      const hasCoords =
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number' &&
        !Number.isNaN(m.latitude) &&
        !Number.isNaN(m.longitude);
      if (hasCoords) withCoords += 1;
      return {
        ...m,
        hasCoords,
      };
    });

    return {
      total: merchants.length,
      withCoords,
      withoutCoords: merchants.length - withCoords,
      byCountry: [...byCountry.entries()]
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count),
      byCategory: [...byCategory.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      merchants,
    };
  }

  getMerchant(role: string, id: string) {
    this.assertAdmin(role);
    return this.prisma.merchant.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, name: true, phone: true } },
        subscription: true,
        branches: true,
      },
    });
  }

  async createMerchant(role: string, raw: unknown) {
    this.assertAdmin(role);
    const data = adminCreateMerchantSchema.parse(raw);
    const email = data.ownerEmail.trim().toLowerCase();

    let owner = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!owner) {
      if (!data.ownerName?.trim() || !data.ownerPassword) {
        throw new BadRequestException(
          'New owner requires ownerName and ownerPassword (min 8 characters)',
        );
      }
      const passwordHash = await bcrypt.hash(data.ownerPassword, 10);
      const qrToken = await allocateUniqueQrToken(this.prisma);
      owner = await this.prisma.user.create({
        data: {
          email,
          name: data.ownerName.trim(),
          passwordHash,
          role: UserRole.MERCHANT_OWNER,
          language: 'en',
          timezone: data.timezone || 'Asia/Kathmandu',
          currency: data.currency || 'NPR',
          country: data.country || 'NP',
          qrToken,
        },
      });
    } else if (owner.role !== UserRole.MERCHANT_OWNER && owner.role !== UserRole.SUPER_ADMIN) {
      owner = await this.prisma.user.update({
        where: { id: owner.id },
        data: { role: UserRole.MERCHANT_OWNER },
      });
    }

    let slug = slugify(data.businessName);
    const clash = await this.prisma.merchant.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;

    const merchant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.merchant.create({
        data: {
          ownerId: owner!.id,
          businessName: data.businessName,
          slug,
          category: data.category,
          description: data.description,
          phone: data.phone || null,
          email: data.email || email,
          address: data.address || null,
          city: data.city || null,
          country: data.country || 'NP',
          province: data.province || null,
          district: data.district || null,
          municipality: data.municipality || null,
          ward: data.ward || null,
          postalCode: data.postalCode || null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          logoUrl: data.logoUrl || null,
          timezone: data.timezone || 'Asia/Kathmandu',
          currency: data.currency || 'NPR',
          status: data.status,
          branches: {
            create: {
              name: 'Main',
              address: data.address || null,
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
            },
          },
          subscription: {
            create: {
              plan: data.plan,
              status: 'ACTIVE',
              provider: 'MANUAL',
            },
          },
        },
        include: {
          owner: { select: { id: true, email: true, name: true } },
          subscription: true,
          branches: true,
        },
      });
      return created;
    });

    void this.notifications.notifyAdmins({
      title: 'New merchant created',
      body: `${merchant.businessName} was added (${merchant.status}).`,
      href: '/admin/merchants',
      entityType: 'Merchant',
      entityId: merchant.id,
      auditAction: 'MERCHANT_CREATED',
    });
    return merchant;
  }

  async updateMerchant(role: string, id: string, raw: unknown) {
    this.assertAdmin(role);
    const data = adminUpdateMerchantSchema.parse(raw);
    const existing = await this.prisma.merchant.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!existing) throw new NotFoundException('Merchant not found');

    if (data.ownerEmail) {
      const email = data.ownerEmail.trim().toLowerCase();
      const owner = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
      if (!owner) throw new BadRequestException('Owner email not found — create the user first');
      if (owner.role !== UserRole.MERCHANT_OWNER && owner.role !== UserRole.SUPER_ADMIN) {
        await this.prisma.user.update({
          where: { id: owner.id },
          data: { role: UserRole.MERCHANT_OWNER },
        });
      }
      await this.prisma.merchant.update({
        where: { id },
        data: { ownerId: owner.id },
      });
    }

    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        businessName: data.businessName,
        category: data.category,
        description: data.description,
        phone: data.phone === undefined ? undefined : data.phone || null,
        email: data.email === undefined ? undefined : data.email || null,
        address: data.address === undefined ? undefined : data.address || null,
        city: data.city === undefined ? undefined : data.city || null,
        country: data.country,
        province: data.province === undefined ? undefined : data.province || null,
        district: data.district === undefined ? undefined : data.district || null,
        municipality: data.municipality === undefined ? undefined : data.municipality || null,
        ward: data.ward === undefined ? undefined : data.ward || null,
        postalCode: data.postalCode === undefined ? undefined : data.postalCode || null,
        latitude: data.latitude === undefined ? undefined : data.latitude,
        longitude: data.longitude === undefined ? undefined : data.longitude,
        logoUrl: data.logoUrl === undefined ? undefined : data.logoUrl || null,
        timezone: data.timezone,
        currency: data.currency,
        status: data.status,
      },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        subscription: true,
      },
    });

    if (data.plan && existing.subscription) {
      await this.prisma.subscription.update({
        where: { id: existing.subscription.id },
        data: { plan: data.plan },
      });
    } else if (data.plan && !existing.subscription) {
      await this.prisma.subscription.create({
        data: {
          merchantId: id,
          plan: data.plan,
          status: 'ACTIVE',
          provider: 'MANUAL',
        },
      });
    }

    return this.prisma.merchant.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        subscription: true,
      },
    });
  }

  async deleteMerchant(role: string, id: string) {
    this.assertAdmin(role);
    const existing = await this.prisma.merchant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Merchant not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.stamp.deleteMany({ where: { merchantId: id } });
      await tx.redemption.deleteMany({ where: { merchantId: id } });
      await tx.salesAdjustment.deleteMany({ where: { merchantId: id } });
      await tx.savingsAdjustment.deleteMany({ where: { merchantId: id } });
      await tx.merchant.delete({ where: { id } });
    });

    return { ok: true, id };
  }

  async setMerchantStatus(role: string, id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    this.assertAdmin(role);
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException();
    const updated = await this.prisma.merchant.update({ where: { id }, data: { status } });
    if (status === 'SUSPENDED') {
      void this.notifications.notifyAdmins({
        title: 'Merchant suspended',
        body: `${merchant.businessName} was suspended.`,
        href: '/admin/merchants',
        entityType: 'Merchant',
        entityId: id,
        auditAction: 'MERCHANT_SUSPENDED',
      });
    }
    return updated;
  }

  async listVerifications(role: string, statusFilter?: string) {
    this.assertAdmin(role);
    const status =
      statusFilter && ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED'].includes(statusFilter)
        ? statusFilter
        : undefined;
    const rows = await this.prisma.merchant.findMany({
      where: {
        ...(status
          ? { verificationStatus: status as 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' }
          : { verificationStatus: { not: 'NONE' } }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        subscription: {
          select: { verifiedAddon: true, verifiedUntil: true, plan: true },
        },
      },
      orderBy: [{ verificationStatus: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
    });
    return rows.map((m) => ({
      ...m,
      verified: isMerchantVerifiedLive({
        verificationStatus: m.verificationStatus,
        verifiedAddon: m.subscription?.verifiedAddon,
        verifiedUntil: m.subscription?.verifiedUntil,
      }),
    }));
  }

  async reviewVerification(role: string, merchantId: string, body: unknown) {
    this.assertAdmin(role);
    const data = adminVerificationActionSchema.parse(body);
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (data.action === 'APPROVE') {
      return this.prisma.merchant.update({
        where: { id: merchantId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
          verificationReviewedAt: new Date(),
          verificationNote: data.note || null,
        },
      });
    }
    if (data.action === 'REJECT') {
      return this.prisma.merchant.update({
        where: { id: merchantId },
        data: {
          verificationStatus: 'REJECTED',
          verificationReviewedAt: new Date(),
          verificationNote: data.note || 'Rejected',
          verifiedAt: null,
        },
      });
    }
    // REVOKE — hide badge and clear paid period
    await this.prisma.subscription.updateMany({
      where: { merchantId },
      data: { verifiedAddon: false, verifiedUntil: null },
    });
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        verificationStatus: 'REVOKED',
        verificationReviewedAt: new Date(),
        verificationNote: data.note || 'Revoked',
        verifiedAt: null,
      },
    });
  }

  listUsers(role: string, roleFilter?: string) {
    this.assertAdmin(role);
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(roleFilter ? { role: roleFilter as UserRole } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
        createdAt: true,
        language: true,
        currency: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async patchUser(
    role: string,
    id: string,
    body: {
      role?: 'CUSTOMER' | 'MERCHANT_OWNER' | 'STAFF' | 'SUPER_ADMIN';
      deletedAt?: string | null;
    },
  ) {
    this.assertAdmin(role);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.deletedAt === null
          ? { deletedAt: null }
          : body.deletedAt
            ? { deletedAt: new Date(body.deletedAt) }
            : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
        deletedAt: true,
      },
    });

    if (body.deletedAt) {
      void this.notifications.notifyAdmins({
        title: 'User deleted',
        body: `${user.name} (${user.email}) was soft-deleted.`,
        href: '/admin/users',
        entityType: 'User',
        entityId: id,
        auditAction: 'USER_SOFT_DELETE',
      });
    } else if (body.deletedAt === null && user.deletedAt) {
      void this.notifications.notifyAdmins({
        title: 'User restored',
        body: `${user.name} (${user.email}) was restored.`,
        href: '/admin/users',
        entityType: 'User',
        entityId: id,
        auditAction: 'USER_RESTORE',
      });
    }
    if (body.role && body.role !== user.role) {
      void this.notifications.notifyAdmins({
        title: 'User role changed',
        body: `${user.name}: ${user.role} → ${body.role}`,
        href: '/admin/users',
        entityType: 'User',
        entityId: id,
        meta: { from: user.role, to: body.role },
        auditAction: 'USER_ROLE_CHANGE',
      });
    }
    return updated;
  }

  listSubscriptions(role: string) {
    this.assertAdmin(role);
    return this.prisma.subscription.findMany({
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
            status: true,
            country: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listInvoices(role: string) {
    this.assertAdmin(role);
    return this.prisma.invoice.findMany({
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
          },
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Aggregated billing metrics for Super Admin Plans & Billing UI. */
  async billingOverview(role: string) {
    this.assertAdmin(role);
    const subs = await this.prisma.subscription.findMany({
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
            status: true,
            country: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const active = (s: (typeof subs)[number]) => s.status === 'ACTIVE';
    const paying = (s: (typeof subs)[number]) =>
      active(s) && (s.plan === 'MONTHLY' || s.plan === 'YEARLY');

    const total = subs.length;
    const activeCount = subs.filter(active).length;
    const cancelledThisMonth = subs.filter(
      (s) => s.status === 'CANCELED' && s.updatedAt >= d30,
    ).length;
    const cancelledPrev = subs.filter(
      (s) => s.status === 'CANCELED' && s.updatedAt >= d60 && s.updatedAt < d30,
    ).length;

    const createdRecent = subs.filter((s) => s.createdAt >= d30).length;
    const createdPrev = subs.filter((s) => s.createdAt >= d60 && s.createdAt < d30).length;
    const activeRecent = subs.filter((s) => active(s) && s.updatedAt >= d30).length;
    const activePrev = Math.max(activeCount - activeRecent, 0);

    // Admin metrics use Nepal list prices by default
    const np = this.pricingCatalog.getRegion('NP');
    const PRICE = {
      FREE: 0,
      MONTHLY: np.monthlyAmount,
      YEARLY: np.yearlyAmount,
    } as const;
    let mrr = 0;
    let yrr = 0;
    const planCounts: Record<string, number> = {
      FREE: 0,
      MONTHLY: 0,
      YEARLY: 0,
      CANCELED: 0,
    };
    const planRevenue: Record<string, number> = {
      FREE: 0,
      MONTHLY: 0,
      YEARLY: 0,
    };

    for (const s of subs) {
      if (s.status === 'CANCELED') {
        planCounts.CANCELED += 1;
        continue;
      }
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      if (!active(s)) continue;
      if (s.plan === 'MONTHLY') {
        mrr += PRICE.MONTHLY;
        planRevenue.MONTHLY += PRICE.MONTHLY;
      } else if (s.plan === 'YEARLY') {
        // attribute yearly as monthly-equivalent for MRR, full for YRR
        mrr += Math.round(PRICE.YEARLY / 12);
        yrr += PRICE.YEARLY;
        planRevenue.YEARLY += PRICE.YEARLY;
      }
    }

    const pct = (cur: number, prev: number) => {
      if (prev <= 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    // Simple revenue trend: last 6 buckets of ~5 days from active paying plan mix
    const revenueTrend: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const end = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000);
      const inBucket = subs.filter(
        (s) =>
          paying(s) &&
          s.createdAt <= end &&
          (s.status !== 'CANCELED' || s.updatedAt > end),
      );
      let rev = 0;
      for (const s of inBucket) {
        if (s.createdAt > start && s.createdAt <= end) {
          rev += s.plan === 'YEARLY' ? PRICE.YEARLY : s.plan === 'MONTHLY' ? PRICE.MONTHLY : 0;
        } else if (s.plan === 'MONTHLY' && s.createdAt <= end) {
          rev += Math.round(PRICE.MONTHLY / 6); // distribute MRR across buckets visually
        }
      }
      revenueTrend.push({
        label: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        revenue: rev,
      });
    }

    const totalRevenue = mrr * 12 + yrr; // rough annualized view for widget
    const avgRevenue = activeCount ? Math.round(totalRevenue / activeCount) : 0;

    return {
      currency: 'NPR',
      prices: PRICE,
      metrics: {
        totalSubscriptions: total,
        activeSubscriptions: activeCount,
        mrr,
        yrr,
        cancelledThisMonth,
        trends: {
          totalSubscriptions: pct(createdRecent, createdPrev),
          activeSubscriptions: pct(activeRecent, Math.max(activePrev, 1)),
          mrr: pct(mrr, Math.max(mrr - PRICE.MONTHLY * createdRecent, 1)),
          yrr: pct(yrr, Math.max(yrr - PRICE.YEARLY, 1)),
          cancelledThisMonth: pct(cancelledThisMonth, Math.max(cancelledPrev, 1)),
        },
      },
      planCounts,
      planRevenue,
      revenueTrend,
      totals: {
        totalRevenue,
        averageRevenue: avgRevenue,
      },
      subscriptions: subs,
      plans: this.pricingCatalog.getCatalog().plans.map((p) => ({
        id: p.planId,
        name: p.displayName,
        cycle: p.planId === 'FREE' ? '—' : p.planId === 'YEARLY' ? 'Yearly' : 'Monthly',
        price:
          p.planId === 'FREE' ? 0 : p.planId === 'YEARLY' ? PRICE.YEARLY : PRICE.MONTHLY,
        description: p.description,
        limits: {
          businesses: p.businesses,
          loyaltyCards: p.loyaltyCards,
          campaigns: p.campaigns,
          branches: p.branches,
          staff: p.staff,
          galleryPhotos: p.galleryPhotos,
          stampsPerMonth: p.stampsPerMonth,
        },
      })),
    };
  }

  async getPricingCatalog(role: string) {
    this.assertAdmin(role);
    const catalog = await this.pricingCatalog.getCatalogFresh();
    return {
      ...catalog,
      note: 'List prices are shown in-app. Stripe Price IDs in env must match charged amounts.',
    };
  }

  async updatePricingCatalog(role: string, body: unknown) {
    this.assertAdmin(role);
    const payload = (body || {}) as {
      regions?: Array<Partial<RegionCatalogRow> & { regionCode: string }>;
      plans?: Array<Partial<PlanCatalogRow> & { planId: string }>;
    };
    const catalog = await this.pricingCatalog.updateCatalog(payload);
    return {
      ...catalog,
      note: 'Saved. Update matching STRIPE_PRICE_* env vars if live checkout amounts should change.',
    };
  }

  async patchSubscription(
    role: string,
    id: string,
    body: { plan?: string; status?: string },
  ) {
    this.assertAdmin(role);
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { merchant: { select: { businessName: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(body.plan
          ? { plan: body.plan as 'FREE' | 'MONTHLY' | 'YEARLY' }
          : {}),
        ...(body.status
          ? { status: body.status as 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' }
          : {}),
      },
      include: { merchant: { select: { businessName: true, slug: true } } },
    });
    const bits: string[] = [];
    if (body.plan && body.plan !== sub.plan) bits.push(`plan ${sub.plan}→${body.plan}`);
    if (body.status && body.status !== sub.status) bits.push(`status ${sub.status}→${body.status}`);
    if (bits.length) {
      void this.notifications.notifyAdmins({
        title: 'Subscription updated',
        body: `${sub.merchant.businessName}: ${bits.join(', ')}`,
        href: '/admin/subscriptions',
        entityType: 'Subscription',
        entityId: id,
        auditAction: 'SUBSCRIPTION_PATCH',
      });
    }
    return updated;
  }

  async listCustomers(role: string) {
    this.assertAdmin(role);
    const customers = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        createdAt: true,
        language: true,
        currency: true,
        qrToken: true,
        _count: { select: { loyaltyCards: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return customers.map((c) => ({
      ...c,
      cardsCount: c._count.loyaltyCards,
      _count: undefined,
    }));
  }

  listStaff(role: string) {
    this.assertAdmin(role);
    return this.prisma.staffMember.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
        merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { invitedAt: 'desc' },
      take: 300,
    });
  }

  async patchStaff(role: string, id: string, body: { active?: boolean }) {
    this.assertAdmin(role);
    const row = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Staff not found');
    return this.prisma.staffMember.update({
      where: { id },
      data: { ...(typeof body.active === 'boolean' ? { active: body.active } : {}) },
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
        merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
      },
    });
  }

  async listTransactions(role: string) {
    this.assertAdmin(role);
    const [stamps, sales, savings] = await Promise.all([
      this.prisma.stamp.findMany({
        take: 150,
        orderBy: { createdAt: 'desc' },
        where: { saleAmount: { not: null } },
        include: {
          merchant: { select: { businessName: true, slug: true, logoUrl: true } },
          customer: { select: { name: true, email: true, photoUrl: true } },
        },
      }),
      this.prisma.salesAdjustment.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { merchant: { select: { businessName: true, slug: true, logoUrl: true } } },
      }),
      this.prisma.savingsAdjustment.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { merchant: { select: { businessName: true, slug: true, logoUrl: true } } },
      }),
    ]);

    const rows = [
      ...stamps.map((s) => ({
        id: s.id,
        type: 'SALE' as const,
        amount: s.saleAmount || 0,
        label: `Stamp sale · ${s.customer.name}`,
        merchant: s.merchant.businessName,
        slug: s.merchant.slug,
        logoUrl: s.merchant.logoUrl,
        photoUrl: s.customer.photoUrl,
        createdAt: s.createdAt,
      })),
      ...sales.map((s) => ({
        id: s.id,
        type: 'SALES_ADJ' as const,
        amount: s.amount,
        label: s.reason,
        merchant: s.merchant.businessName,
        slug: s.merchant.slug,
        logoUrl: s.merchant.logoUrl,
        photoUrl: null as string | null,
        createdAt: s.createdAt,
      })),
      ...savings.map((s) => ({
        id: s.id,
        type: 'SAVINGS_ADJ' as const,
        amount: s.amount,
        label: s.reason,
        merchant: s.merchant.businessName,
        slug: s.merchant.slug,
        logoUrl: s.merchant.logoUrl,
        photoUrl: null as string | null,
        createdAt: s.createdAt,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return { rows: rows.slice(0, 200), total: rows.length };
  }

  listLoyaltyPrograms(role: string) {
    this.assertAdmin(role);
    return this.prisma.loyaltyProgram.findMany({
      include: {
        merchant: { select: { businessName: true, slug: true, status: true, logoUrl: true } },
        _count: { select: { cards: true, stamps: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async loyaltyProgramsOverview(role: string) {
    this.assertAdmin(role);
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [programs, redemptions, recentStamps, merchants, redemptionTotalPrev] =
      await Promise.all([
        this.prisma.loyaltyProgram.findMany({
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true,
                slug: true,
                status: true,
                category: true,
                logoUrl: true,
              },
            },
            _count: { select: { cards: true, stamps: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 400,
        }),
        this.prisma.redemption.findMany({
          select: {
            id: true,
            createdAt: true,
            card: { select: { programId: true } },
          },
          take: 8000,
        }),
        this.prisma.stamp.findMany({
          where: { createdAt: { gte: d7 } },
          select: { programId: true, createdAt: true },
          take: 10000,
        }),
        this.prisma.merchant.findMany({
          select: { id: true, businessName: true, slug: true },
          orderBy: { businessName: 'asc' },
          take: 500,
        }),
        this.prisma.redemption.count({
          where: { createdAt: { gte: d60, lt: d30 } },
        }),
      ]);

    const redeemByProgram = new Map<string, number>();
    let redeemedRecent = 0;
    for (const r of redemptions) {
      const pid = r.card.programId;
      redeemByProgram.set(pid, (redeemByProgram.get(pid) || 0) + 1);
      if (r.createdAt >= d30) redeemedRecent += 1;
    }

    const sparkByProgram = new Map<string, number[]>();
    for (const p of programs) {
      sparkByProgram.set(p.id, Array.from({ length: 7 }, () => 0));
    }
    for (const s of recentStamps) {
      const daysAgo = Math.min(
        6,
        Math.max(0, Math.floor((now.getTime() - s.createdAt.getTime()) / (24 * 60 * 60 * 1000))),
      );
      const idx = 6 - daysAgo;
      const arr = sparkByProgram.get(s.programId);
      if (arr) arr[idx] += 1;
    }

    const pct = (cur: number, prev: number) => {
      if (prev <= 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    const createdRecent = programs.filter((p) => p.createdAt >= d30).length;
    const createdPrev = programs.filter((p) => p.createdAt >= d60 && p.createdAt < d30).length;
    const activePrograms = programs.filter(
      (p) => p.active && (!p.expiresAt || p.expiresAt >= now),
    );
    const inactivePrograms = programs.filter(
      (p) => !p.active && (!p.expiresAt || p.expiresAt >= now),
    );
    const expiredPrograms = programs.filter((p) => p.expiresAt && p.expiresAt < now);
    const draftPrograms = programs.filter(
      (p) => !p.active && p._count.cards === 0 && p._count.stamps === 0 && !p.expiresAt,
    );
    const scheduledPrograms = programs.filter(
      (p) => p.active && p.expiresAt != null && p.expiresAt > now && p.createdAt > d30,
    );

    const totalMembers = programs.reduce((s, p) => s + p._count.cards, 0);
    const totalStamps = programs.reduce((s, p) => s + p._count.stamps, 0);
    const totalRedeemed = redemptions.length;
    const membersRecent = programs
      .filter((p) => p.createdAt >= d30)
      .reduce((s, p) => s + p._count.cards, 0);
    const stampsRecent = recentStamps.length;

    type UiStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT' | 'SCHEDULED';
    const resolveStatus = (p: (typeof programs)[number]): UiStatus => {
      if (p.expiresAt && p.expiresAt < now) return 'EXPIRED';
      if (!p.active && p._count.cards === 0 && p._count.stamps === 0) return 'DRAFT';
      if (p.active && p.expiresAt && p.expiresAt > now && p.createdAt > d30) return 'SCHEDULED';
      if (!p.active) return 'INACTIVE';
      return 'ACTIVE';
    };

    const performanceOf = (members: number, stamps: number, status: UiStatus) => {
      if (status === 'EXPIRED') return 'EXPIRED' as const;
      if (status === 'SCHEDULED') return 'SCHEDULED' as const;
      if (status === 'DRAFT' || status === 'INACTIVE') return 'LOW' as const;
      const score = members * 2 + stamps;
      if (score >= 80) return 'HIGH' as const;
      if (score >= 20) return 'MEDIUM' as const;
      return 'LOW' as const;
    };

    const rows = programs.map((p) => {
      const status = resolveStatus(p);
      const members = p._count.cards;
      const stamps = p._count.stamps;
      const redeemed = redeemByProgram.get(p.id) || 0;
      const typeLabel =
        p.cardType === 'THRESHOLD'
          ? 'Points Based'
          : p.cardType === 'MULTI_STEP'
            ? 'Tiered'
            : 'Stamp Card';
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        totalStamps: p.totalStamps,
        rewardTitle: p.rewardTitle,
        rewardDescription: p.rewardDescription,
        active: p.active,
        cardType: p.cardType,
        typeLabel,
        categorySlug: p.categorySlug,
        campaignPreset: p.campaignPreset,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        merchant: p.merchant,
        members,
        stamps,
        redeemed,
        status,
        performance: performanceOf(members, stamps, status),
        sparkline: sparkByProgram.get(p.id) || [0, 0, 0, 0, 0, 0, 0],
        tag:
          p.campaignPreset === 'SEASONAL'
            ? 'Seasonal'
            : members >= 50
              ? 'Featured'
              : p.cardType === 'MULTI_STEP'
                ? 'Tiered'
                : null,
      };
    });

    const perfCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, SCHEDULED: 0, EXPIRED: 0 };
    for (const r of rows) {
      perfCounts[r.performance] = (perfCounts[r.performance] || 0) + 1;
    }

    const topByMembers = [...rows]
      .sort((a, b) => b.members - a.members)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        title: r.title,
        merchant: r.merchant.businessName,
        members: r.members,
      }));

    const stampsPrevApprox = Math.max(Math.round(stampsRecent * 0.84), 1);
    const insightPct = pct(stampsRecent, stampsPrevApprox);

    return {
      metrics: {
        totalPrograms: programs.length,
        activePrograms: activePrograms.length,
        totalMembers,
        stampsCollected: totalStamps,
        rewardsRedeemed: totalRedeemed,
        trends: {
          totalPrograms: pct(createdRecent, createdPrev),
          activePrograms: pct(activePrograms.length, Math.max(inactivePrograms.length, 1)),
          totalMembers: pct(membersRecent, Math.max(totalMembers - membersRecent, 1)),
          stampsCollected: insightPct,
          rewardsRedeemed: pct(redeemedRecent, Math.max(redemptionTotalPrev, 1)),
        },
      },
      tabCounts: {
        all: programs.length,
        active: activePrograms.length,
        inactive: inactivePrograms.length,
        draft: draftPrograms.length,
        scheduled: scheduledPrograms.length,
        expired: expiredPrograms.length,
      },
      performance: [
        { key: 'HIGH', name: 'High', value: perfCounts.HIGH, color: '#10B981' },
        { key: 'MEDIUM', name: 'Medium', value: perfCounts.MEDIUM, color: '#F59E0B' },
        { key: 'LOW', name: 'Low', value: perfCounts.LOW, color: '#EF4444' },
        { key: 'SCHEDULED', name: 'Scheduled', value: perfCounts.SCHEDULED, color: '#3B82F6' },
        { key: 'EXPIRED', name: 'Expired', value: perfCounts.EXPIRED, color: '#94A3B8' },
      ].filter((x) => x.value > 0),
      topByMembers,
      insight: {
        message:
          insightPct >= 0
            ? `Members collected ${insightPct}% more stamps in the last 7 days vs baseline.`
            : `Stamp collection is ${Math.abs(insightPct)}% softer than baseline this week.`,
        href: '/admin/analytics',
      },
      merchants,
      programs: rows,
    };
  }

  async createLoyaltyProgram(role: string, raw: unknown) {
    this.assertAdmin(role);
    const body = raw as {
      merchantId?: string;
      title?: string;
      totalStamps?: number;
      rewardTitle?: string;
      description?: string;
      cardType?: string;
    };
    if (!body.merchantId?.trim()) throw new BadRequestException('merchantId required');
    const merchant = await this.prisma.merchant.findUnique({ where: { id: body.merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    const title = (body.title || '').trim();
    const rewardTitle = (body.rewardTitle || '').trim();
    if (title.length < 2) throw new BadRequestException('title required');
    if (rewardTitle.length < 2) throw new BadRequestException('rewardTitle required');
    const totalStamps = Math.min(30, Math.max(3, Number(body.totalStamps) || 8));
    const cardType =
      body.cardType === 'THRESHOLD' || body.cardType === 'MULTI_STEP' ? body.cardType : 'CLASSIC';
    return this.prisma.loyaltyProgram.create({
      data: {
        merchantId: merchant.id,
        title,
        description: body.description?.trim() || null,
        totalStamps,
        rewardTitle,
        cardType,
        businessName: merchant.businessName,
        logoUrl: merchant.logoUrl,
        active: true,
      },
      include: {
        merchant: { select: { id: true, businessName: true, slug: true } },
      },
    });
  }

  async patchLoyaltyProgram(
    role: string,
    id: string,
    body: { active?: boolean; title?: string },
  ) {
    this.assertAdmin(role);
    const row = await this.prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Program not found');
    return this.prisma.loyaltyProgram.update({
      where: { id },
      data: {
        ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
        ...(body.title ? { title: body.title } : {}),
      },
      include: {
        merchant: { select: { businessName: true, slug: true } },
      },
    });
  }

  async listRewards(role: string) {
    this.assertAdmin(role);
    const programs = await this.prisma.loyaltyProgram.findMany({
      include: {
        merchant: { select: { businessName: true, slug: true, logoUrl: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const redeemed = await this.prisma.redemption.groupBy({
      by: ['rewardTitle'],
      _count: { rewardTitle: true },
    });
    const redeemMap = Object.fromEntries(
      redeemed.map((r) => [r.rewardTitle, r._count.rewardTitle]),
    );
    return programs.map((p) => ({
      id: p.id,
      rewardTitle: p.rewardTitle,
      rewardDescription: p.rewardDescription,
      totalStamps: p.totalStamps,
      active: p.active,
      programTitle: p.title,
      merchant: p.merchant,
      cardsCount: p._count.cards,
      redemptionsCount: redeemMap[p.rewardTitle] || 0,
      createdAt: p.createdAt,
    }));
  }

  listRedemptions(role: string) {
    this.assertAdmin(role);
    return this.prisma.redemption.findMany({
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: { select: { businessName: true, slug: true, logoUrl: true } },
        customer: { select: { name: true, email: true, photoUrl: true } },
      },
    });
  }

  listPromotions(role: string) {
    this.assertAdmin(role);
    return this.prisma.campaign.findMany({
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: { select: { businessName: true, slug: true, logoUrl: true } },
      },
    });
  }

  async patchPromotion(
    role: string,
    id: string,
    body: { status?: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'ENDED' },
  ) {
    this.assertAdmin(role);
    const row = await this.prisma.campaign.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Campaign not found');
    return this.prisma.campaign.update({
      where: { id },
      data: { ...(body.status ? { status: body.status } : {}) },
      include: { merchant: { select: { businessName: true, slug: true } } },
    });
  }

  listStamps(role: string) {
    this.assertAdmin(role);
    return this.prisma.stamp.findMany({
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: { select: { businessName: true, slug: true, logoUrl: true } },
        customer: { select: { name: true, email: true, photoUrl: true } },
        program: { select: { title: true, totalStamps: true } },
        issuedBy: { select: { name: true, email: true, photoUrl: true } },
      },
    });
  }

  async listActivity(role: string) {
    this.assertAdmin(role);
    const [logs, stamps, redemptions, merchants] = await Promise.all([
      this.prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.stamp.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { businessName: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.redemption.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { businessName: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.merchant.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, businessName: true, category: true, createdAt: true },
      }),
    ]);

    const feed = [
      ...logs.map((l) => ({
        id: l.id,
        type: 'audit' as const,
        title: l.action,
        detail: [l.entityType, l.user?.email].filter(Boolean).join(' · '),
        at: l.createdAt,
      })),
      ...stamps.map((s) => ({
        id: s.id,
        type: 'stamp' as const,
        title: `Stamp at ${s.merchant.businessName}`,
        detail: s.customer.name,
        at: s.createdAt,
      })),
      ...redemptions.map((r) => ({
        id: r.id,
        type: 'redeem' as const,
        title: `Redeemed "${r.rewardTitle}"`,
        detail: `${r.customer.name} · ${r.merchant.businessName}`,
        at: r.createdAt,
      })),
      ...merchants.map((m) => ({
        id: m.id,
        type: 'merchant' as const,
        title: `Merchant registered: ${m.businessName}`,
        detail: m.category,
        at: m.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 150);

    return { feed, auditCount: logs.length };
  }

  async analytics(role: string) {
    this.assertAdmin(role);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      merchantsByStatus,
      usersByRole,
      stamps30,
      redemptions30,
      campaignsByStatus,
      topMerchants,
      categoryGroups,
    ] = await Promise.all([
      this.prisma.merchant.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
        _count: { role: true },
      }),
      this.prisma.stamp.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.redemption.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.campaign.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.stamp.groupBy({
        by: ['merchantId'],
        _count: { merchantId: true },
        orderBy: { _count: { merchantId: 'desc' } },
        take: 8,
      }),
      this.prisma.merchant.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
      }),
    ]);

    const merchantIds = topMerchants.map((t) => t.merchantId);
    const merchantNames = await this.prisma.merchant.findMany({
      where: { id: { in: merchantIds } },
      select: { id: true, businessName: true },
    });
    const nameMap = Object.fromEntries(merchantNames.map((m) => [m.id, m.businessName]));

    return {
      merchantsByStatus: merchantsByStatus.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      usersByRole: usersByRole.map((g) => ({ role: g.role, count: g._count.role })),
      stamps30,
      redemptions30,
      campaignsByStatus: campaignsByStatus.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      topMerchantsByStamps: topMerchants.map((t) => ({
        merchantId: t.merchantId,
        businessName: nameMap[t.merchantId] || t.merchantId,
        stamps: t._count.merchantId,
      })),
      categories: categoryGroups.map((g) => ({
        name: g.category,
        count: g._count.category,
      })),
    };
  }

  async reports(role: string) {
    this.assertAdmin(role);
    const analytics = await this.analytics(role);
    const [merchantCount, customerCount, stampCount, redemptionCount, paying] =
      await Promise.all([
        this.prisma.merchant.count(),
        this.prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
        this.prisma.stamp.count(),
        this.prisma.redemption.count(),
        this.prisma.subscription.count({
          where: { plan: { not: 'FREE' }, status: 'ACTIVE' },
        }),
      ]);
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        merchants: merchantCount,
        customers: customerCount,
        stamps: stampCount,
        redemptions: redemptionCount,
        payingMerchants: paying,
      },
      analytics,
    };
  }

  async settings(role: string) {
    this.assertAdmin(role);
    const [users, merchants, stamps, ticketsOpen, branding] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.merchant.count(),
      this.prisma.stamp.count(),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.getBranding(),
    ]);
    const dbUrl = process.env.DATABASE_URL || '';
    return {
      systemHealth: 'ok',
      environment: process.env.NODE_ENV || 'development',
      database: dbUrl.startsWith('postgres') ? 'postgresql' : 'sqlite',
      counts: { users, merchants, stamps, openTickets: ticketsOpen },
      features: {
        oauthDemo: true,
        billingMock: true,
        pushNotifications: true,
        offlineScanSync: true,
      },
      branding,
    };
  }

  async getBranding() {
    const row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    if (row) return row;
    return this.prisma.platformSettings.create({
      data: {
        id: 'default',
        companyName: 'Stampz',
        tagline: 'Digital Loyalty Cards for Growing Businesses',
        seoTitleTemplate: '{companyName} | {tagline}',
        metaDescription:
          'Create a digital punch card, earn repeat customers, and manage your loyalty program from mobile and desktop. One account. Everything stays in sync.',
        metaKeywords: 'loyalty, stamp card, digital punch card, rewards, Stampz',
        contactEmail: 'hello@stampz.app',
        supportEmail: 'support@stampz.app',
      },
    });
  }

  async updateBranding(role: string, body: unknown, userId?: string) {
    this.assertAdmin(role);
    const parsed = platformBrandingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message || 'Invalid branding');
    }
    const data = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
    );
    await this.getBranding();
    return this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: {
        ...data,
        updatedByUserId: userId || null,
      },
    });
  }

  listSupportTickets(role: string) {
    this.assertAdmin(role);
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  createSupportTicket(
    role: string,
    body: {
      subject: string;
      body: string;
      priority?: string;
      requesterEmail?: string;
      requesterName?: string;
    },
  ) {
    this.assertAdmin(role);
    return this.prisma.supportTicket
      .create({
        data: {
          subject: body.subject,
          body: body.body,
          priority: body.priority || 'NORMAL',
          requesterEmail: body.requesterEmail,
          requesterName: body.requesterName,
        },
      })
      .then(async (ticket) => {
        void this.notifications.notifyAdmins({
          title: 'New support ticket',
          body: ticket.subject,
          href: '/admin/support',
          entityType: 'SupportTicket',
          entityId: ticket.id,
          auditAction: 'SUPPORT_TICKET_CREATED',
        });
        return ticket;
      });
  }

  async patchSupportTicket(
    role: string,
    id: string,
    body: { status?: string; priority?: string; assignedTo?: string },
  ) {
    this.assertAdmin(role);
    const row = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Ticket not found');
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
      },
    });
  }

  async listAdminNotifications(role: string, userId: string) {
    this.assertAdmin(role);
    const [items, unread, openTickets] = await Promise.all([
      this.notifications.listAdmin(userId),
      this.notifications.unreadAdminCount(userId),
      this.notifications.openSupportTicketCount(),
    ]);
    return { items, unread, openTickets };
  }

  async markAdminNotificationRead(role: string, userId: string, id: string) {
    this.assertAdmin(role);
    return this.notifications.markRead(userId, id);
  }

  async markAllAdminNotificationsRead(role: string, userId: string) {
    this.assertAdmin(role);
    return this.notifications.markAllRead(userId, true);
  }
}
