import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { stampScanSchema } from '@stampperk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';
import { allocateUniqueQrToken, isLegacyQrToken } from '../common/qr-token';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';

type Step = { at: number; rewardTitle: string; rewardDescription?: string };

@Injectable()
export class QrService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private referrals: ReferralsService,
    private pricingCatalog: PricingCatalogService,
  ) {}

  async myQr(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, qrToken: true, role: true },
    });
    if (!user) throw new NotFoundException();

    if (isLegacyQrToken(user.qrToken)) {
      const qrToken = await allocateUniqueQrToken(this.prisma);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { qrToken },
        select: { id: true, name: true, qrToken: true, role: true },
      });
    }

    return {
      userId: user.id,
      name: user.name,
      qrPayload: `stampperk:customer:${user.qrToken}`,
      qrToken: user.qrToken,
    };
  }

  async scanStamp(actorId: string, raw: unknown, merchantId?: string) {
    const parsed = stampScanSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join('.') || '';
      if (path === 'customerQrToken') {
        throw new BadRequestException(
          'Paste or scan a valid customer QR (stampperk:customer:...)',
        );
      }
      throw new BadRequestException(issue?.message || 'Invalid scan payload');
    }
    const data = parsed.data;
    const token = data.customerQrToken
      .replace(/^(stampperk|stampz):customer:/i, '')
      .trim();
    if (token.length < 4 || token.length > 40) {
      throw new BadRequestException(
        'Paste or scan a valid customer QR (stampperk:customer:...)',
      );
    }
    const customer = await this.prisma.user.findFirst({ where: { qrToken: token, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer QR invalid');

    const merchant = await this.prisma.merchant.findFirst({
      where: {
        ...(merchantId ? { id: merchantId } : {}),
        OR: [{ ownerId: actorId }, { staff: { some: { userId: actorId, active: true } } }],
      },
      include: {
        subscription: true,
        loyaltyPrograms: { where: { active: true }, orderBy: { createdAt: 'asc' } },
        staff: { where: { userId: actorId, active: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Merchant access required');

    const isOwner = merchant.ownerId === actorId;
    const staff = merchant.staff[0];
    const staffPerms = staff
      ? (() => {
          try {
            return JSON.parse(staff.permissions) as string[];
          } catch {
            return [] as string[];
          }
        })()
      : [];
    if (!isOwner && staff && !staffPerms.includes('SCAN') && !staffPerms.includes('MANAGE')) {
      throw new ForbiddenException('Scan permission required');
    }

    const program =
      (data.programId
        ? merchant.loyaltyPrograms.find((p) => p.id === data.programId)
        : merchant.loyaltyPrograms[0]) || null;
    if (!program) throw new BadRequestException('No active loyalty program');

    const limits = this.pricingCatalog.planLimits(merchant.subscription?.plan);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const stampsThisMonth = await this.prisma.stamp.count({
      where: { merchantId: merchant.id, createdAt: { gte: monthStart } },
    });
    if (stampsThisMonth >= limits.stampsPerMonth) {
      throw new ForbiddenException('Monthly stamp limit reached. Upgrade your plan.');
    }

    if (data.offlineId) {
      const existing = await this.prisma.stamp.findUnique({ where: { offlineId: data.offlineId } });
      if (existing) return { duplicate: true, stamp: existing };
    }

    const scannedAt = data.scannedAt ? new Date(data.scannedAt) : new Date();
    const cardType = program.cardType || 'CLASSIC';

    const result = await this.prisma.$transaction(async (tx) => {
      const card = await tx.loyaltyCard.upsert({
        where: { programId_customerId: { programId: program.id, customerId: customer.id } },
        create: {
          programId: program.id,
          customerId: customer.id,
          stampCount: 0,
          progressValue: 0,
          expiresAt: program.expiryDays
            ? new Date(Date.now() + program.expiryDays * 86400000)
            : null,
        },
        update: {},
      });

      let nextCount = card.stampCount;
      let progressValue = card.progressValue;
      let availableRewards = card.availableRewards;
      let completedCycles = card.completedCycles;
      let rewardUnlocked = false;
      const unlockedTitles: string[] = [];

      if (cardType === 'THRESHOLD') {
        const target = program.thresholdValue || program.totalStamps;
        if (program.thresholdType === 'SPEND') {
          const amount = data.saleAmount ?? 0;
          if (amount <= 0) throw new BadRequestException('saleAmount required for spend threshold');
          progressValue += amount;
        } else {
          progressValue += 1;
          nextCount += 1;
        }
        while (progressValue >= target) {
          availableRewards += 1;
          completedCycles += 1;
          progressValue -= target;
          rewardUnlocked = true;
          unlockedTitles.push(program.rewardTitle);
        }
        if (program.thresholdType !== 'SPEND') {
          nextCount = Math.min(Math.floor(progressValue), program.totalStamps);
        } else {
          nextCount = Math.min(
            Math.floor((progressValue / target) * program.totalStamps),
            program.totalStamps - 1,
          );
        }
      } else if (cardType === 'MULTI_STEP') {
        const prev = card.stampCount;
        nextCount = prev + 1;
        const steps = (Array.isArray(program.stepsJson) ? program.stepsJson : []) as Step[];
        for (const step of steps) {
          if (prev < step.at && nextCount >= step.at) {
            availableRewards += 1;
            rewardUnlocked = true;
            unlockedTitles.push(step.rewardTitle);
          }
        }
        if (nextCount >= program.totalStamps) {
          availableRewards += 1;
          completedCycles += 1;
          nextCount = 0;
          rewardUnlocked = true;
          unlockedTitles.push(program.rewardTitle);
        }
      } else {
        nextCount = card.stampCount + 1;
        if (nextCount >= program.totalStamps) {
          availableRewards += 1;
          completedCycles += 1;
          nextCount = 0;
          rewardUnlocked = true;
          unlockedTitles.push(program.rewardTitle);
        }
      }

      const stamp = await tx.stamp.create({
        data: {
          cardId: card.id,
          programId: program.id,
          merchantId: merchant.id,
          customerId: customer.id,
          issuedById: actorId,
          saleAmount: data.saleAmount,
          offlineId: data.offlineId,
          createdAt: scannedAt,
        },
      });

      const updatedCard = await tx.loyaltyCard.update({
        where: { id: card.id },
        data: { stampCount: nextCount, progressValue, availableRewards, completedCycles },
        include: { program: true },
      });

      if (data.offlineId) {
        await tx.offlineScan.upsert({
          where: { offlineId: data.offlineId },
          create: {
            offlineId: data.offlineId,
            scannerId: actorId,
            payloadJson: data as object,
            syncedAt: new Date(),
          },
          update: { syncedAt: new Date() },
        });
      }

      return { stamp, card: updatedCard, rewardUnlocked, unlockedTitles };
    });

    await this.notifications.create(customer.id, {
      title: 'Stamp added',
      body: `${merchant.businessName}: progress on ${program.title}`,
      type: 'STAMP_ADDED',
      dataJson: { stampId: result.stamp.id },
    });

    if (result.rewardUnlocked) {
      for (const title of result.unlockedTitles) {
        await this.notifications.create(customer.id, {
          title: 'Reward ready!',
          body: `You unlocked: ${title}`,
          type: 'REWARD_READY',
          dataJson: { cardId: result.card.id },
        });
      }
    }

    if (!(result as { duplicate?: boolean }).duplicate) {
      try {
        await this.referrals.afterSuccessfulStamp({
          customerId: customer.id,
          merchantId: merchant.id,
          programId: program.id,
          cardId: result.card.id,
          issuedById: actorId,
        });
      } catch {
        /* referral failures must not block stamp */
      }
    }

    return result;
  }

  async syncOffline(actorId: string, scans: unknown[], merchantId?: string) {
    const results = [];
    for (const scan of scans) {
      try {
        const result = await this.scanStamp(actorId, scan, merchantId);
        results.push({ ok: true, result });
      } catch (e) {
        results.push({
          ok: false,
          error: e instanceof Error ? e.message : 'Failed',
          offlineId: (scan as { offlineId?: string })?.offlineId,
        });
      }
    }
    return { synced: results.filter((r) => r.ok).length, results };
  }
}
