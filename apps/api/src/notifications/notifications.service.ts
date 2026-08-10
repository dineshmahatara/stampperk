import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  createAnnouncementSchema,
  createPushSendSchema,
  estimateAudienceSchema,
  updateLocationSchema,
} from '@stampz/shared';
import {
  CustomerSegment,
  NotificationType,
  Prisma,
  PushAudience,
  PushContentType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: {
      title: string;
      body: string;
      type: NotificationType;
      dataJson?: Prisma.InputJsonValue;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        type: data.type,
        dataJson: data.dataJson,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushConsent: true,
        notifyOffers: true,
        notifyLoyalty: true,
        notifyExpiry: true,
        notifyTransfers: true,
        notifyStaff: true,
      },
    });

    if (user && this.shouldDispatchPush(user, data.type)) {
      await this.dispatchPush(userId, data.title, data.body, data.dataJson);
    }

    return notification;
  }

  /** Fan-out inbox alerts to every Super Admin (no device push). */
  async notifyAdmins(input: {
    title: string;
    body: string;
    href?: string;
    entityType?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
    actorUserId?: string | null;
    auditAction?: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', deletedAt: null },
      select: { id: true },
    });
    const dataJson = {
      href: input.href || '/admin',
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.meta || {}),
    } as Prisma.InputJsonValue;

    if (admins.length) {
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: input.title,
          body: input.body,
          type: NotificationType.ADMIN_ALERT,
          dataJson,
        })),
      });
    }

    if (input.auditAction) {
      await this.prisma.auditLog.create({
        data: {
          userId: input.actorUserId || null,
          action: input.auditAction,
          entityType: input.entityType,
          entityId: input.entityId,
          metaJson: dataJson,
        },
      });
    }

    return { notified: admins.length };
  }

  listAdmin(userId: string, take = 40) {
    return this.prisma.notification.findMany({
      where: { userId, type: NotificationType.ADMIN_ALERT },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async unreadAdminCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, type: NotificationType.ADMIN_ALERT, read: false },
    });
  }

  async openSupportTicketCount() {
    return this.prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } },
    });
  }

  async markAllRead(userId: string, adminOnly = false) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        ...(adminOnly ? { type: NotificationType.ADMIN_ALERT } : {}),
      },
      data: { read: true },
    });
    return { ok: true };
  }

  /** Inbox always stores the alert; push respects master + category toggles. */
  private shouldDispatchPush(
    user: {
      pushConsent: boolean;
      notifyOffers: boolean;
      notifyLoyalty: boolean;
      notifyExpiry: boolean;
      notifyTransfers: boolean;
      notifyStaff: boolean;
    },
    type: NotificationType,
  ) {
    if (!user.pushConsent) return false;
    switch (type) {
      case NotificationType.NEW_OFFER:
      case NotificationType.MERCHANT_PUSH:
      case NotificationType.ANNOUNCEMENT:
      case NotificationType.BIRTHDAY:
        return user.notifyOffers;
      case NotificationType.STAMP_ADDED:
      case NotificationType.REWARD_READY:
      case NotificationType.REWARD_REDEEMED:
        return user.notifyLoyalty;
      case NotificationType.EXPIRING:
        return user.notifyExpiry;
      case NotificationType.STAMP_TRANSFER:
        return user.notifyTransfers;
      case NotificationType.REFERRAL_REWARD:
        return user.notifyLoyalty;
      case NotificationType.SYSTEM:
      case NotificationType.ADMIN_ALERT:
        // Essential / admin inbox: no category gate; ADMIN_ALERT skips push via early return below.
        return type !== NotificationType.ADMIN_ALERT;
      default:
        return true;
    }
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { ok: true };
  }

  registerDevice(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform },
      update: { platform },
    });
  }

  async updateLocation(userId: string, body: unknown) {
    const data = updateLocationSchema.parse(body);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLat: data.latitude,
        lastLng: data.longitude,
        lastLocationAt: new Date(),
      },
      select: { id: true, lastLat: true, lastLng: true, lastLocationAt: true },
    });
  }

  async listMerchantSends(userId: string, merchantId?: string) {
    const merchant = await this.requireMerchantAccess(userId, merchantId);
    return this.prisma.merchantPushSend.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        program: { select: { id: true, title: true, logoUrl: true, stampColor: true } },
        campaign: { select: { id: true, title: true, badgeText: true, imageUrl: true } },
      },
    });
  }

  async estimateAudience(userId: string, body: unknown, merchantId?: string) {
    const data = estimateAudienceSchema.parse(body);
    const merchant = await this.requireMerchantAccess(userId, merchantId);
    const recipientIds = await this.resolveAudience(merchant.id, data.audience, data.radiusKm, data.branchId);
    return {
      eligible: recipientIds.length,
      capped: recipientIds.length,
      audience: data.audience,
      radiusKm: data.radiusKm,
    };
  }

  async listAnnouncements(userId: string, merchantId?: string) {
    const merchant = await this.requireMerchantAccess(userId, merchantId);
    return this.prisma.merchantAnnouncement.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createAnnouncement(userId: string, body: unknown, merchantId?: string) {
    const data = createAnnouncementSchema.parse(body);
    const merchant = await this.requireMerchantOwner(userId, merchantId);
    const segment = (data.segment || 'ALL') as CustomerSegment;

    const announcement = await this.prisma.merchantAnnouncement.create({
      data: {
        merchantId: merchant.id,
        createdById: userId,
        title: data.title,
        body: data.body,
        segment,
        status: data.publish ? 'SENT' : 'DRAFT',
        publishedAt: data.publish ? new Date() : null,
        sentCount: 0,
      },
    });

    if (!data.publish) {
      return announcement;
    }

    return this.fanOutAnnouncement(announcement.id, merchant.id, data.title, data.body, segment);
  }

  async publishAnnouncement(userId: string, announcementId: string, merchantId?: string) {
    const merchant = await this.requireMerchantOwner(userId, merchantId);
    const announcement = await this.prisma.merchantAnnouncement.findFirst({
      where: { id: announcementId, merchantId: merchant.id },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.status === 'SENT') {
      throw new BadRequestException('Announcement already sent');
    }

    await this.prisma.merchantAnnouncement.update({
      where: { id: announcement.id },
      data: { status: 'SENT', publishedAt: new Date() },
    });

    return this.fanOutAnnouncement(
      announcement.id,
      merchant.id,
      announcement.title,
      announcement.body,
      announcement.segment,
    );
  }

  private async fanOutAnnouncement(
    announcementId: string,
    merchantId: string,
    title: string,
    body: string,
    segment: CustomerSegment,
  ) {
    const recipientIds = await this.resolveAnnouncementRecipients(merchantId, segment);
    let sentCount = 0;
    for (const recipientId of recipientIds) {
      try {
        await this.create(recipientId, {
          title,
          body,
          type: NotificationType.ANNOUNCEMENT,
          dataJson: {
            announcementId,
            merchantId,
            segment,
          },
        });
        sentCount += 1;
      } catch (e) {
        this.logger.warn(
          `Announcement fan-out failed for ${recipientId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return this.prisma.merchantAnnouncement.update({
      where: { id: announcementId },
      data: { sentCount },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  private async resolveAnnouncementRecipients(merchantId: string, segment: CustomerSegment) {
    if (segment === CustomerSegment.ALL) {
      return this.loyaltyCustomerIds(merchantId);
    }

    const cards = await this.prisma.loyaltyCard.findMany({
      where: { program: { merchantId, active: true }, customer: { deletedAt: null } },
      select: {
        customerId: true,
        stampCount: true,
        completedCycles: true,
        createdAt: true,
        stamps: { select: { saleAmount: true, createdAt: true } },
      },
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
      const distinctDays = new Set(c.stamps.map((s) => s.createdAt.toISOString().slice(0, 10)));
      const visitCount = distinctDays.size || c.stampCount;
      return { customerId: c.customerId, spend, lastVisitAt, visitCount, completedCycles: c.completedCycles, joinedAt: c.createdAt };
    });

    const spends = enriched.map((e) => e.spend).sort((a, b) => a - b);
    const vipSpendThreshold =
      spends.length === 0
        ? Number.POSITIVE_INFINITY
        : spends[Math.floor(spends.length * 0.75)] ?? spends[spends.length - 1];

    const now = new Date();
    const ms30 = 30 * 86400000;
    const matched = new Set<string>();
    for (const e of enriched) {
      const atRisk =
        (e.lastVisitAt != null && now.getTime() - e.lastVisitAt.getTime() > ms30) ||
        (e.lastVisitAt == null && now.getTime() - e.joinedAt.getTime() > ms30);
      let computed: CustomerSegment;
      if (atRisk) computed = CustomerSegment.AT_RISK;
      else {
        const vipBySpend =
          e.spend > 0 && Number.isFinite(vipSpendThreshold) && e.spend >= vipSpendThreshold;
        if (e.completedCycles >= 2 || vipBySpend) computed = CustomerSegment.VIP;
        else if (now.getTime() - e.joinedAt.getTime() <= ms30 && e.visitCount <= 1) {
          computed = CustomerSegment.NEW;
        } else {
          computed = e.visitCount >= 2 ? CustomerSegment.RETURNING : CustomerSegment.NEW;
        }
      }
      if (computed === segment) matched.add(e.customerId);
    }
    return Array.from(matched);
  }

  async sendMerchantPush(userId: string, body: unknown, merchantId?: string) {
    const data = createPushSendSchema.parse(body);
    const merchant = await this.requireMerchantOwner(userId, merchantId);

    if (data.contentType === 'LOYALTY_CARD') {
      if (!data.programId) throw new BadRequestException('Select a loyalty card');
      const program = await this.prisma.loyaltyProgram.findFirst({
        where: { id: data.programId, merchantId: merchant.id, active: true },
      });
      if (!program) throw new NotFoundException('Loyalty card not found');
    }
    if (data.contentType === 'OFFER') {
      if (!data.campaignId) throw new BadRequestException('Select an offer');
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: data.campaignId, merchantId: merchant.id, status: 'ACTIVE' },
      });
      if (!campaign) throw new NotFoundException('Active offer not found');
    }

    const recipientIds = await this.resolveAudience(
      merchant.id,
      data.audience as PushAudience,
      data.radiusKm,
      data.branchId,
    );

    const send = await this.prisma.merchantPushSend.create({
      data: {
        merchantId: merchant.id,
        createdById: userId,
        contentType: data.contentType as PushContentType,
        title: data.title,
        body: data.body,
        programId: data.programId || null,
        campaignId: data.campaignId || null,
        audience: data.audience as PushAudience,
        radiusKm: data.radiusKm,
        branchId: data.branchId || null,
        status: 'SENT',
        estimatedCount: recipientIds.length,
        sentCount: 0,
        dataJson: {
          contentType: data.contentType,
          programId: data.programId,
          campaignId: data.campaignId,
        },
      },
    });

    let sentCount = 0;
    for (const recipientId of recipientIds) {
      try {
        await this.create(recipientId, {
          title: data.title,
          body: data.body,
          type: NotificationType.MERCHANT_PUSH,
          dataJson: {
            pushSendId: send.id,
            merchantId: merchant.id,
            contentType: data.contentType,
            programId: data.programId,
            campaignId: data.campaignId,
          },
        });
        sentCount += 1;
      } catch (e) {
        this.logger.warn(`Push fan-out failed for ${recipientId}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return this.prisma.merchantPushSend.update({
      where: { id: send.id },
      data: { sentCount },
      include: {
        program: { select: { id: true, title: true } },
        campaign: { select: { id: true, title: true } },
      },
    });
  }

  private async resolveAudience(
    merchantId: string,
    audience: PushAudience | string,
    radiusKm: number,
    branchId?: string,
  ): Promise<string[]> {
    const loyaltyIds = await this.loyaltyCustomerIds(merchantId);
    if (audience === 'LOYALTY_CUSTOMERS') return loyaltyIds;

    const nearIds = await this.nearCustomerIds(merchantId, radiusKm, branchId);
    if (audience === 'NEAR_AREA') return nearIds;

    // CUSTOMERS_AND_OUTSIDE = loyalty union near (deduped)
    return Array.from(new Set([...loyaltyIds, ...nearIds]));
  }

  private async loyaltyCustomerIds(merchantId: string) {
    const cards = await this.prisma.loyaltyCard.findMany({
      where: { program: { merchantId, active: true }, customer: { deletedAt: null } },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    return cards.map((c) => c.customerId);
  }

  private async nearCustomerIds(merchantId: string, radiusKm: number, branchId?: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { branches: true },
    });
    if (!merchant) return [];

    let originLat = merchant.latitude;
    let originLng = merchant.longitude;
    if (branchId) {
      const branch = merchant.branches.find((b) => b.id === branchId);
      if (branch?.latitude != null && branch?.longitude != null) {
        originLat = branch.latitude;
        originLng = branch.longitude;
      }
    } else {
      const withCoords = merchant.branches.find((b) => b.latitude != null && b.longitude != null);
      if (withCoords) {
        originLat = withCoords.latitude!;
        originLng = withCoords.longitude!;
      }
    }

    if (originLat == null || originLng == null) return [];

    // Rough bbox then precise haversine (SQLite has no geo index)
    const delta = radiusKm / 111;
    const candidates = await this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        deletedAt: null,
        lastLat: { gte: originLat - delta, lte: originLat + delta },
        lastLng: { gte: originLng - delta, lte: originLng + delta },
      },
      select: { id: true, lastLat: true, lastLng: true },
    });

    return candidates
      .filter(
        (u) =>
          u.lastLat != null &&
          u.lastLng != null &&
          haversineKm(originLat!, originLng!, u.lastLat, u.lastLng) <= radiusKm,
      )
      .map((u) => u.id);
  }

  private async requireMerchantAccess(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ...(merchantId ? { id: merchantId } : {}),
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  private async requireMerchantOwner(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ownerId: userId,
        ...(merchantId ? { id: merchantId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Merchant owner required');
    return merchant;
  }

  private async dispatchPush(
    userId: string,
    title: string,
    body: string,
    dataJson?: Prisma.InputJsonValue,
  ) {
    const devices = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (!devices.length) return;

    const messages = devices.map((d) => ({
      to: d.token,
      sound: 'default' as const,
      title,
      body,
      data: (dataJson as Record<string, unknown>) || {},
    }));

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        this.logger.warn(`Expo push failed: ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Expo push error: ${e instanceof Error ? e.message : e}`);
    }
  }
}
