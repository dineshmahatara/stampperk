import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createLoyaltyProgramSchema,
  createStampTransferSchema,
  getLoyaltyCatalog,
  redeemSchema,
  STAMP_TRANSFER_OFFER_HOURS,
  updateLoyaltyProgramSchema,
} from '@stampz/shared';
import { NotificationType, Prisma, StampTransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';

type Step = { at: number; rewardTitle: string; rewardDescription?: string };

function parseExpiresAt(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(value.includes('T') ? value : `${value}T23:59:59.000Z`);
}

@Injectable()
export class LoyaltyService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pricingCatalog: PricingCatalogService,
  ) {}

  catalog() {
    return getLoyaltyCatalog();
  }

  async createProgram(userId: string, raw: unknown, merchantId?: string) {
    const data = createLoyaltyProgramSchema.parse(raw);
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ownerId: userId,
        ...(merchantId ? { id: merchantId } : {}),
      },
      include: { subscription: true, loyaltyPrograms: { where: { active: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Merchant owner required');

    const limits = this.pricingCatalog.planLimits(merchant.subscription?.plan);
    if (merchant.loyaltyPrograms.length >= limits.loyaltyCards) {
      throw new ForbiddenException('Loyalty card limit reached. Upgrade your plan.');
    }

    this.validateCardRules(data);

    const location =
      data.cardLocation ||
      [merchant.address, merchant.city].filter(Boolean).join(', ') ||
      merchant.city ||
      null;

    return this.prisma.loyaltyProgram.create({
      data: {
        merchantId: merchant.id,
        title: data.title,
        description: data.description,
        totalStamps: data.totalStamps,
        rewardTitle: data.rewardTitle,
        rewardDescription: data.rewardDescription,
        expiryDays: data.expiryDays,
        expiresAt: parseExpiresAt(data.expiresAt),
        cardType: data.cardType,
        categorySlug: data.categorySlug,
        templateId: data.templateId,
        businessName: data.businessName || merchant.businessName || null,
        logoUrl: data.logoUrl || merchant.logoUrl || null,
        logoScale: data.logoScale ?? 1,
        logoOffsetX: data.logoOffsetX ?? 0,
        logoOffsetY: data.logoOffsetY ?? 0,
        logoPosX: data.logoPosX ?? 50,
        logoPosY: data.logoPosY ?? 32,
        promoImageUrl: data.promoImageUrl || null,
        stampColor: data.stampColor,
        emptyStampColor: data.emptyStampColor,
        accentColor: data.accentColor,
        fontStyle: data.fontStyle,
        thresholdType: data.thresholdType,
        thresholdValue: data.thresholdValue,
        stepsJson: data.stepsJson as Prisma.InputJsonValue | undefined,
        campaignPreset: data.campaignPreset,
        doubleSided: data.doubleSided ?? true,
        // Prefer Business Profile contact for stamp card back
        cardPhone: data.cardPhone || merchant.phone || null,
        cardEmail: data.cardEmail || merchant.email || null,
        cardLocation: location,
        cardWebsite: data.cardWebsite || merchant.website || null,
        cardFacebook: data.cardFacebook || merchant.facebook || null,
        cardInstagram: data.cardInstagram || merchant.instagram || null,
        cardTiktok: data.cardTiktok || merchant.tiktok || null,
        deliveryAvailable: data.deliveryAvailable ?? Boolean(merchant.deliveryEnabled),
        referralEnabled: data.referralEnabled ?? false,
        referralBonusReferrer: data.referralBonusReferrer ?? 1,
        referralBonusReferee: data.referralBonusReferee ?? 1,
      },
    });
  }

  async listPrograms(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ...(merchantId ? { id: merchantId } : {}),
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.prisma.loyaltyProgram.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProgram(ownerId: string, programId: string, raw: unknown, merchantId?: string) {
    const data = updateLoyaltyProgramSchema.parse(raw);
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId, ...(merchantId ? { id: merchantId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Merchant owner required');
    const existing = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Program not found');

    const merged = { ...existing, ...data };
    this.validateCardRules(merged);

    return this.prisma.loyaltyProgram.update({
      where: { id: programId },
      data: {
        title: data.title,
        description: data.description,
        totalStamps: data.totalStamps,
        rewardTitle: data.rewardTitle,
        rewardDescription: data.rewardDescription,
        expiryDays: data.expiryDays,
        expiresAt: data.expiresAt === undefined ? undefined : parseExpiresAt(data.expiresAt),
        active: data.active,
        cardType: data.cardType,
        categorySlug: data.categorySlug,
        templateId: data.templateId,
        businessName: data.businessName === undefined ? undefined : data.businessName || null,
        logoUrl: data.logoUrl === undefined ? undefined : data.logoUrl || null,
        logoScale: data.logoScale,
        logoOffsetX: data.logoOffsetX,
        logoOffsetY: data.logoOffsetY,
        logoPosX: data.logoPosX,
        logoPosY: data.logoPosY,
        promoImageUrl: data.promoImageUrl === undefined ? undefined : data.promoImageUrl || null,
        stampColor: data.stampColor,
        emptyStampColor: data.emptyStampColor,
        accentColor: data.accentColor,
        fontStyle: data.fontStyle,
        thresholdType: data.thresholdType,
        thresholdValue: data.thresholdValue,
        stepsJson: data.stepsJson as Prisma.InputJsonValue | undefined,
        campaignPreset: data.campaignPreset,
        doubleSided: data.doubleSided,
        cardPhone: data.cardPhone === undefined ? undefined : data.cardPhone || null,
        cardEmail: data.cardEmail === undefined ? undefined : data.cardEmail || null,
        cardLocation: data.cardLocation === undefined ? undefined : data.cardLocation || null,
        cardWebsite: data.cardWebsite === undefined ? undefined : data.cardWebsite || null,
        cardFacebook: data.cardFacebook === undefined ? undefined : data.cardFacebook || null,
        cardInstagram: data.cardInstagram === undefined ? undefined : data.cardInstagram || null,
        cardTiktok: data.cardTiktok === undefined ? undefined : data.cardTiktok || null,
        deliveryAvailable: data.deliveryAvailable,
        referralEnabled: data.referralEnabled,
        referralBonusReferrer: data.referralBonusReferrer,
        referralBonusReferee: data.referralBonusReferee,
      },
    });
  }

  async deleteProgram(ownerId: string, programId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId, ...(merchantId ? { id: merchantId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Merchant owner required');
    const existing = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Program not found');
    return this.prisma.loyaltyProgram.update({
      where: { id: programId },
      data: { active: false },
    });
  }

  async enroll(customerId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, active: true },
      include: { merchant: true },
    });
    if (!program) throw new NotFoundException('Program not found');

    const expiresAt = program.expiryDays
      ? new Date(Date.now() + program.expiryDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.loyaltyCard.upsert({
      where: { programId_customerId: { programId, customerId } },
      create: { programId, customerId, expiresAt },
      update: {},
      include: {
        program: { include: { merchant: { select: { id: true, businessName: true, logoUrl: true, slug: true } } } },
      },
    });
  }

  async myCards(customerId: string) {
    return this.prisma.loyaltyCard.findMany({
      where: { customerId },
      include: {
        program: {
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true,
                logoUrl: true,
                slug: true,
                category: true,
                tagline: true,
                phone: true,
                email: true,
                website: true,
                address: true,
                city: true,
                facebook: true,
                instagram: true,
                tiktok: true,
              },
            },
          },
        },
        redemptions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async redeem(actorId: string, raw: unknown) {
    const data = redeemSchema.parse(raw);
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { id: data.cardId },
      include: { program: true, customer: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    if (card.availableRewards < 1) throw new BadRequestException('No rewards available');

    const canAct =
      card.customerId === actorId ||
      (await this.canMerchantAct(actorId, card.program.merchantId, 'REDEEM'));
    if (!canAct) throw new ForbiddenException('Not allowed to redeem');

    if (data.customerQrToken) {
      const customer = await this.prisma.user.findFirst({
        where: { qrToken: data.customerQrToken, id: card.customerId },
      });
      if (!customer) throw new BadRequestException('Customer QR mismatch');
    }

    const redemption = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.loyaltyCard.update({
        where: { id: card.id },
        data: { availableRewards: { decrement: 1 } },
      });
      if (updated.availableRewards < 0) throw new BadRequestException('No rewards available');
      return tx.redemption.create({
        data: {
          cardId: card.id,
          merchantId: card.program.merchantId,
          customerId: card.customerId,
          rewardTitle: card.program.rewardTitle,
        },
      });
    });

    await this.notifications.create(card.customerId, {
      title: 'Reward redeemed',
      body: `You redeemed: ${card.program.rewardTitle}`,
      type: 'REWARD_REDEEMED',
      dataJson: { redemptionId: redemption.id },
    });

    return redemption;
  }

  /** Expire stale pending offers (lazy — called from list/mutate endpoints). */
  async expirePendingTransfers() {
    const now = new Date();
    const stale = await this.prisma.stampTransfer.findMany({
      where: {
        status: StampTransferStatus.PENDING,
        OR: [
          { offerExpiresAt: { lt: now } },
          { stampExpiresAt: { lt: now } },
        ],
      },
    });
    for (const t of stale) {
      await this.prisma.$transaction(async (tx) => {
        const still = await tx.stampTransfer.findFirst({
          where: { id: t.id, status: StampTransferStatus.PENDING },
        });
        if (!still) return;
        await tx.loyaltyCard.update({
          where: { id: still.fromCardId },
          data: { stampCount: { increment: still.amount } },
        });
        await tx.stampTransfer.update({
          where: { id: still.id },
          data: { status: StampTransferStatus.EXPIRED, resolvedAt: now },
        });
      });
    }
    return { expired: stale.length };
  }

  private async resolveTransferRecipient(raw: {
    toEmail?: string;
    toPhone?: string;
    toQrToken?: string;
  }) {
    if (raw.toQrToken) {
      const u = await this.prisma.user.findFirst({
        where: { qrToken: raw.toQrToken, deletedAt: null },
      });
      if (!u) throw new NotFoundException('Recipient not found (QR)');
      return u;
    }
    if (raw.toEmail) {
      const email = raw.toEmail.trim().toLowerCase();
      const u = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
      if (!u) throw new NotFoundException('Recipient not found (email)');
      return u;
    }
    if (raw.toPhone) {
      const phone = raw.toPhone.trim();
      const u = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [{ phone }, { alternatePhone: phone }],
        },
      });
      if (!u) throw new NotFoundException('Recipient not found (phone)');
      return u;
    }
    throw new BadRequestException('Provide toEmail, toPhone, or toQrToken');
  }

  /**
   * Create a peer stamp transfer within the same business program.
   * Stamps are held (deducted) immediately; returned if declined/cancelled/expired.
   * stampExpiresAt preserves the sender's original card expiry (does not reset on accept).
   */
  async createStampTransfer(fromCustomerId: string, raw: unknown) {
    await this.expirePendingTransfers();
    const data = createStampTransferSchema.parse(raw);
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { id: data.cardId },
      include: {
        program: { include: { merchant: { select: { id: true, businessName: true } } } },
        customer: { select: { id: true, name: true } },
      },
    });
    if (!card || card.customerId !== fromCustomerId) {
      throw new ForbiddenException('Not your card');
    }
    if (!card.program.active) throw new BadRequestException('Program is inactive');
    if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('These stamps have expired and cannot be transferred');
    }
    if (card.stampCount < data.amount) {
      throw new BadRequestException(`Only ${card.stampCount} stamp(s) available`);
    }

    const recipient = await this.resolveTransferRecipient(data);
    if (recipient.id === fromCustomerId) {
      throw new BadRequestException('Cannot transfer stamps to yourself');
    }

    const offerExpiresAt = new Date(Date.now() + STAMP_TRANSFER_OFFER_HOURS * 60 * 60 * 1000);
    // Carry original expiry — recipient inherits this absolute time on accept.
    const stampExpiresAt = card.expiresAt;

    const transfer = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.loyaltyCard.update({
        where: { id: card.id },
        data: { stampCount: { decrement: data.amount } },
      });
      if (updated.stampCount < 0) {
        throw new BadRequestException('Not enough stamps');
      }
      return tx.stampTransfer.create({
        data: {
          merchantId: card.program.merchantId,
          programId: card.programId,
          fromCardId: card.id,
          fromCustomerId,
          toCustomerId: recipient.id,
          amount: data.amount,
          stampExpiresAt,
          offerExpiresAt,
          note: data.note,
          status: StampTransferStatus.PENDING,
        },
        include: {
          program: { select: { id: true, title: true, totalStamps: true, rewardTitle: true } },
          fromUser: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        },
      });
    });

    await this.notifications.create(recipient.id, {
      title: 'Stamp transfer waiting',
      body: `${card.customer.name} wants to send you ${data.amount} stamp(s) from ${card.program.merchant.businessName}. Accept within ${STAMP_TRANSFER_OFFER_HOURS}h.`,
      type: NotificationType.STAMP_TRANSFER,
      dataJson: { transferId: transfer.id, programId: card.programId },
    });

    return transfer;
  }

  async listStampTransfers(userId: string) {
    await this.expirePendingTransfers();
    const transfers = await this.prisma.stampTransfer.findMany({
      where: {
        OR: [{ fromCustomerId: userId }, { toCustomerId: userId }],
      },
      include: {
        program: { select: { id: true, title: true, totalStamps: true, rewardTitle: true } },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      incoming: transfers.filter(
        (t) => t.toCustomerId === userId && t.status === StampTransferStatus.PENDING,
      ),
      outgoing: transfers.filter(
        (t) => t.fromCustomerId === userId && t.status === StampTransferStatus.PENDING,
      ),
      history: transfers.filter((t) => t.status !== StampTransferStatus.PENDING),
    };
  }

  async acceptStampTransfer(userId: string, transferId: string) {
    await this.expirePendingTransfers();
    const transfer = await this.prisma.stampTransfer.findUnique({
      where: { id: transferId },
      include: {
        program: true,
        fromUser: { select: { id: true, name: true } },
        merchant: { select: { businessName: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.toCustomerId !== userId) throw new ForbiddenException('Not your transfer');
    if (transfer.status !== StampTransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is ${transfer.status.toLowerCase()}`);
    }
    if (transfer.offerExpiresAt.getTime() < Date.now()) {
      await this.expirePendingTransfers();
      throw new BadRequestException('Transfer offer expired — stamps returned to sender');
    }
    if (transfer.stampExpiresAt && transfer.stampExpiresAt.getTime() < Date.now()) {
      await this.expirePendingTransfers();
      throw new BadRequestException('These stamps have expired');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.stampTransfer.findFirst({
        where: { id: transferId, status: StampTransferStatus.PENDING },
      });
      if (!locked) throw new BadRequestException('Transfer no longer pending');

      const toCard = await tx.loyaltyCard.upsert({
        where: {
          programId_customerId: {
            programId: transfer.programId,
            customerId: userId,
          },
        },
        create: {
          programId: transfer.programId,
          customerId: userId,
          stampCount: transfer.amount,
          // Keep original earner's expiry clock — do not refresh from program.expiryDays
          expiresAt: transfer.stampExpiresAt,
        },
        update: {
          stampCount: { increment: transfer.amount },
        },
      });

      // Existing recipient card: keep the earliest expiry so transferred stamps
      // cannot outlive the original earn window.
      if (transfer.stampExpiresAt) {
        const existing = toCard.expiresAt;
        const nextExpiry =
          existing && existing.getTime() < transfer.stampExpiresAt.getTime()
            ? existing
            : transfer.stampExpiresAt;
        if (!existing || existing.getTime() !== nextExpiry.getTime()) {
          await tx.loyaltyCard.update({
            where: { id: toCard.id },
            data: { expiresAt: nextExpiry },
          });
        }
      }

      return tx.stampTransfer.update({
        where: { id: transferId },
        data: { status: StampTransferStatus.ACCEPTED, resolvedAt: new Date() },
        include: {
          program: { select: { id: true, title: true, totalStamps: true, rewardTitle: true } },
          fromUser: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        },
      });
    });

    await this.notifications.create(transfer.fromCustomerId, {
      title: 'Stamp transfer accepted',
      body: `Your ${transfer.amount} stamp(s) from ${transfer.merchant.businessName} were accepted.`,
      type: NotificationType.STAMP_TRANSFER,
      dataJson: { transferId: transfer.id },
    });

    return result;
  }

  async declineStampTransfer(userId: string, transferId: string) {
    return this.resolveTransferAsRecipient(userId, transferId, StampTransferStatus.DECLINED);
  }

  async cancelStampTransfer(userId: string, transferId: string) {
    await this.expirePendingTransfers();
    const transfer = await this.prisma.stampTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.fromCustomerId !== userId) throw new ForbiddenException('Not your transfer');
    if (transfer.status !== StampTransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is ${transfer.status.toLowerCase()}`);
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const still = await tx.stampTransfer.findFirst({
        where: { id: transferId, status: StampTransferStatus.PENDING },
      });
      if (!still) throw new BadRequestException('Transfer no longer pending');
      await tx.loyaltyCard.update({
        where: { id: still.fromCardId },
        data: { stampCount: { increment: still.amount } },
      });
      return tx.stampTransfer.update({
        where: { id: transferId },
        data: { status: StampTransferStatus.CANCELLED, resolvedAt: now },
        include: {
          program: { select: { id: true, title: true } },
          toUser: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, businessName: true } },
        },
      });
    });
    return updated;
  }

  private async resolveTransferAsRecipient(
    userId: string,
    transferId: string,
    status: typeof StampTransferStatus.DECLINED,
  ) {
    await this.expirePendingTransfers();
    const transfer = await this.prisma.stampTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.toCustomerId !== userId) throw new ForbiddenException('Not your transfer');
    if (transfer.status !== StampTransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is ${transfer.status.toLowerCase()}`);
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const still = await tx.stampTransfer.findFirst({
        where: { id: transferId, status: StampTransferStatus.PENDING },
      });
      if (!still) throw new BadRequestException('Transfer no longer pending');
      await tx.loyaltyCard.update({
        where: { id: still.fromCardId },
        data: { stampCount: { increment: still.amount } },
      });
      return tx.stampTransfer.update({
        where: { id: transferId },
        data: { status, resolvedAt: now },
        include: {
          program: { select: { id: true, title: true } },
          fromUser: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, businessName: true } },
        },
      });
    });

    await this.notifications.create(transfer.fromCustomerId, {
      title: 'Stamp transfer declined',
      body: `Your stamp transfer was declined — stamps are back on your card.`,
      type: NotificationType.STAMP_TRANSFER,
      dataJson: { transferId },
    });

    return updated;
  }

  private validateCardRules(data: {
    cardType?: string | null;
    totalStamps?: number | null;
    thresholdType?: string | null;
    thresholdValue?: number | null;
    stepsJson?: unknown;
  }) {
    const type = data.cardType || 'CLASSIC';
    if (type === 'THRESHOLD') {
      if (!data.thresholdType || data.thresholdValue == null || data.thresholdValue <= 0) {
        throw new BadRequestException('Threshold cards need thresholdType and thresholdValue');
      }
    }
    if (type === 'MULTI_STEP') {
      const steps = (data.stepsJson as Step[] | null) || [];
      if (!steps.length) {
        throw new BadRequestException('Multi-step cards need at least one milestone in stepsJson');
      }
      const max = data.totalStamps || 8;
      for (const s of steps) {
        if (s.at > max) throw new BadRequestException(`Milestone at ${s.at} exceeds total stamps`);
      }
    }
  }

  private async canMerchantAct(userId: string, merchantId: string, permission: 'SCAN' | 'REDEEM' | 'MANAGE') {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (merchant?.ownerId === userId) return true;
    const staff = await this.prisma.staffMember.findFirst({
      where: { merchantId, userId, active: true },
    });
    if (!staff) return false;
    let perms: string[] = [];
    try {
      perms = JSON.parse(staff.permissions);
    } catch {
      perms = [];
    }
    return perms.includes(permission) || perms.includes('MANAGE');
  }
}
