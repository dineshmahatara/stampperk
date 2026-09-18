import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLATFORM_REFERRAL_BONUS } from '@stampperk/shared';
import { Prisma, ReferralScope, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { allocateUniqueQrToken, randomShortQrToken } from '../common/qr-token';

const WEB_PUBLIC =
  (process.env.PUBLIC_WEB_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.referralCode) return user.referralCode;

    for (let attempt = 0; attempt < 24; attempt++) {
      const code = randomShortQrToken(6 + (attempt > 12 ? 2 : 0));
      try {
        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
          select: { referralCode: true },
        });
        return updated.referralCode!;
      } catch {
        /* unique collision — retry */
      }
    }
    const fallback = await allocateUniqueQrToken(this.prisma, 8);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: fallback },
      select: { referralCode: true },
    });
    return updated.referralCode!;
  }

  /**
   * Attach a referral after signup. Silent no-op on invalid/self/duplicate codes.
   */
  async attachOnRegister(input: {
    refereeId: string;
    referralCode?: string | null;
    referralMerchantId?: string | null;
    referralProgramId?: string | null;
  }) {
    const raw = (input.referralCode || '').trim().toUpperCase();
    if (!raw) return null;

    const referrer = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ referralCode: raw }, { referralCode: input.referralCode!.trim() }],
      },
      select: { id: true, referralCode: true },
    });
    if (!referrer || referrer.id === input.refereeId) return null;

    const existing = await this.prisma.referral.findUnique({
      where: { refereeId: input.refereeId },
    });
    if (existing) return existing;

    let scope: ReferralScope = ReferralScope.PLATFORM;
    let merchantId: string | null = null;
    let programId: string | null = null;

    if (input.referralMerchantId) {
      const merchant = await this.prisma.merchant.findFirst({
        where: { id: input.referralMerchantId },
        select: { id: true },
      });
      if (merchant) {
        scope = ReferralScope.MERCHANT;
        merchantId = merchant.id;
        if (input.referralProgramId) {
          const program = await this.prisma.loyaltyProgram.findFirst({
            where: {
              id: input.referralProgramId,
              merchantId: merchant.id,
              referralEnabled: true,
              active: true,
            },
            select: { id: true },
          });
          if (program) programId = program.id;
          else {
            const fallback = await this.prisma.loyaltyProgram.findFirst({
              where: { merchantId: merchant.id, referralEnabled: true, active: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            });
            programId = fallback?.id || null;
          }
        } else {
          const fallback = await this.prisma.loyaltyProgram.findFirst({
            where: { merchantId: merchant.id, referralEnabled: true, active: true },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          programId = fallback?.id || null;
        }
      }
    }

    try {
      const [referral] = await this.prisma.$transaction([
        this.prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: input.refereeId,
            scope,
            merchantId,
            programId,
            codeUsed: raw,
            status: ReferralStatus.PENDING,
          },
        }),
        this.prisma.user.update({
          where: { id: input.refereeId },
          data: { referredByUserId: referrer.id },
        }),
      ]);
      return referral;
    } catch {
      return null;
    }
  }

  async me(userId: string) {
    const code = await this.ensureReferralCode(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pendingBonusStamps: true },
    });

    const [joined, rewarded, recent, merchantPrograms] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: ReferralStatus.REWARDED },
      }),
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          referee: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, businessName: true, slug: true } },
          program: { select: { id: true, title: true } },
        },
      }),
      this.prisma.loyaltyProgram.findMany({
        where: { referralEnabled: true, active: true },
        take: 30,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          referralBonusReferrer: true,
          referralBonusReferee: true,
          merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        },
      }),
    ]);

    return {
      referralCode: code,
      shareUrl: `${WEB_PUBLIC}/register?ref=${encodeURIComponent(code)}`,
      pendingBonusStamps: user?.pendingBonusStamps ?? 0,
      stats: {
        friendsJoined: joined,
        rewarded,
        pending: joined - rewarded,
      },
      recent: recent.map((r) => ({
        id: r.id,
        status: r.status,
        scope: r.scope,
        createdAt: r.createdAt,
        rewardedAt: r.rewardedAt,
        friendName: r.referee.name,
        merchantName: r.merchant?.businessName || null,
        programTitle: r.program?.title || null,
      })),
      merchantPrograms: merchantPrograms.map((p) => ({
        programId: p.id,
        title: p.title,
        bonusReferrer: p.referralBonusReferrer,
        bonusReferee: p.referralBonusReferee,
        merchantId: p.merchant.id,
        businessName: p.merchant.businessName,
        slug: p.merchant.slug,
        logoUrl: p.merchant.logoUrl,
        shareUrl: `${WEB_PUBLIC}/b/${p.merchant.slug}?ref=${encodeURIComponent(code)}&program=${encodeURIComponent(p.id)}`,
      })),
      platformBonus: PLATFORM_REFERRAL_BONUS,
    };
  }

  /**
   * After a successful stamp: apply platform pending bonuses, then qualify referrals.
   */
  async afterSuccessfulStamp(input: {
    customerId: string;
    merchantId: string;
    programId: string;
    cardId: string;
    issuedById: string;
  }) {
    await this.applyPendingPlatformBonus(input);

    const referral = await this.prisma.referral.findFirst({
      where: { refereeId: input.customerId, status: ReferralStatus.PENDING },
    });
    if (!referral) return;

    if (referral.scope === ReferralScope.MERCHANT) {
      if (referral.merchantId && referral.merchantId !== input.merchantId) return;
      const programId = referral.programId || input.programId;
      const program = await this.prisma.loyaltyProgram.findFirst({
        where: { id: programId, merchantId: input.merchantId, active: true },
      });
      if (!program?.referralEnabled) return;
      await this.rewardMerchantReferral(referral.id, program, input);
      return;
    }

    // PLATFORM: any first stamp qualifies
    await this.rewardPlatformReferral(referral.id);
  }

  private async applyPendingPlatformBonus(input: {
    customerId: string;
    merchantId: string;
    programId: string;
    cardId: string;
    issuedById: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.customerId },
      select: { pendingBonusStamps: true },
    });
    const bonus = user?.pendingBonusStamps ?? 0;
    if (bonus <= 0) return;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const fresh = await tx.user.findUnique({
        where: { id: input.customerId },
        select: { pendingBonusStamps: true },
      });
      const n = fresh?.pendingBonusStamps ?? 0;
      if (n <= 0) return;
      await tx.user.update({
        where: { id: input.customerId },
        data: { pendingBonusStamps: 0 },
      });
      await this.addStampsToCard(tx, {
        cardId: input.cardId,
        programId: input.programId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        issuedById: input.issuedById,
        amount: n,
        offlinePrefix: 'ref-pending',
      });
    });

    await this.notifications.create(input.customerId, {
      title: 'Referral bonus applied',
      body: `${bonus} bonus stamp${bonus === 1 ? '' : 's'} added to your card.`,
      type: 'REFERRAL_REWARD',
      dataJson: { kind: 'pending_applied', amount: bonus },
    });
  }

  private async rewardPlatformReferral(referralId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral || referral.status !== ReferralStatus.PENDING) return;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const rewardedToday = await this.prisma.referral.count({
      where: {
        referrerId: referral.referrerId,
        status: ReferralStatus.REWARDED,
        rewardedAt: { gte: dayStart },
      },
    });
    if (rewardedToday >= PLATFORM_REFERRAL_BONUS.dailyCapPerReferrer) {
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { status: ReferralStatus.INVALID },
      });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: referralId },
        data: { status: ReferralStatus.REWARDED, rewardedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: referral.referrerId },
        data: { pendingBonusStamps: { increment: PLATFORM_REFERRAL_BONUS.referrer } },
      }),
      this.prisma.user.update({
        where: { id: referral.refereeId },
        data: { pendingBonusStamps: { increment: PLATFORM_REFERRAL_BONUS.referee } },
      }),
    ]);

    await this.notifications.create(referral.referrerId, {
      title: 'Refer & Earn reward',
      body: `A friend earned their first stamp. You get ${PLATFORM_REFERRAL_BONUS.referrer} bonus stamps on your next visit.`,
      type: 'REFERRAL_REWARD',
      dataJson: { referralId, role: 'referrer', scope: 'PLATFORM' },
    });
    await this.notifications.create(referral.refereeId, {
      title: 'Welcome bonus',
      body: `Thanks for joining via a friend. You get ${PLATFORM_REFERRAL_BONUS.referee} bonus stamps on your next visit.`,
      type: 'REFERRAL_REWARD',
      dataJson: { referralId, role: 'referee', scope: 'PLATFORM' },
    });
  }

  private async rewardMerchantReferral(
    referralId: string,
    program: {
      id: string;
      merchantId: string;
      title: string;
      totalStamps: number;
      rewardTitle: string;
      cardType: string;
      referralBonusReferrer: number;
      referralBonusReferee: number;
      expiryDays: number | null;
    },
    stampCtx: { customerId: string; issuedById: string },
  ) {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral || referral.status !== ReferralStatus.PENDING) return;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const rewardedToday = await this.prisma.referral.count({
      where: {
        referrerId: referral.referrerId,
        status: ReferralStatus.REWARDED,
        rewardedAt: { gte: dayStart },
      },
    });
    if (rewardedToday >= PLATFORM_REFERRAL_BONUS.dailyCapPerReferrer) {
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { status: ReferralStatus.INVALID },
      });
      return;
    }

    const referrerBonus = Math.max(0, program.referralBonusReferrer);
    const refereeBonus = Math.max(0, program.referralBonusReferee);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.referral.update({
        where: { id: referralId },
        data: { status: ReferralStatus.REWARDED, rewardedAt: new Date(), programId: program.id },
      });

      if (refereeBonus > 0) {
        const refereeCard = await tx.loyaltyCard.upsert({
          where: {
            programId_customerId: {
              programId: program.id,
              customerId: referral.refereeId,
            },
          },
          create: {
            programId: program.id,
            customerId: referral.refereeId,
            stampCount: 0,
            expiresAt: program.expiryDays
              ? new Date(Date.now() + program.expiryDays * 86400000)
              : null,
          },
          update: {},
        });
        await this.addStampsToCard(tx, {
          cardId: refereeCard.id,
          programId: program.id,
          merchantId: program.merchantId,
          customerId: referral.refereeId,
          issuedById: stampCtx.issuedById,
          amount: refereeBonus,
          offlinePrefix: 'ref-m-referee',
        });
      }

      if (referrerBonus > 0) {
        const referrerCard = await tx.loyaltyCard.upsert({
          where: {
            programId_customerId: {
              programId: program.id,
              customerId: referral.referrerId,
            },
          },
          create: {
            programId: program.id,
            customerId: referral.referrerId,
            stampCount: 0,
            expiresAt: program.expiryDays
              ? new Date(Date.now() + program.expiryDays * 86400000)
              : null,
          },
          update: {},
        });
        await this.addStampsToCard(tx, {
          cardId: referrerCard.id,
          programId: program.id,
          merchantId: program.merchantId,
          customerId: referral.referrerId,
          issuedById: stampCtx.issuedById,
          amount: referrerBonus,
          offlinePrefix: 'ref-m-referrer',
        });
      }
    });

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: program.merchantId },
      select: { businessName: true },
    });
    const biz = merchant?.businessName || 'the business';

    await this.notifications.create(referral.referrerId, {
      title: 'Referral reward',
      body: `Your friend visited ${biz}. You earned ${referrerBonus} stamp${referrerBonus === 1 ? '' : 's'} on ${program.title}.`,
      type: 'REFERRAL_REWARD',
      dataJson: { referralId, role: 'referrer', scope: 'MERCHANT', programId: program.id },
    });
    await this.notifications.create(referral.refereeId, {
      title: 'Referral welcome bonus',
      body: `Welcome bonus: ${refereeBonus} stamp${refereeBonus === 1 ? '' : 's'} on ${program.title}.`,
      type: 'REFERRAL_REWARD',
      dataJson: { referralId, role: 'referee', scope: 'MERCHANT', programId: program.id },
    });
  }

  /** Classic-style stamp increments (reward unlock when completing a cycle). */
  private async addStampsToCard(
    tx: Prisma.TransactionClient,
    input: {
      cardId: string;
      programId: string;
      merchantId: string;
      customerId: string;
      issuedById: string;
      amount: number;
      offlinePrefix: string;
    },
  ) {
    if (input.amount <= 0) return;
    const program = await tx.loyaltyProgram.findUnique({ where: { id: input.programId } });
    if (!program) return;
    let card = await tx.loyaltyCard.findUnique({ where: { id: input.cardId } });
    if (!card) return;

    let nextCount = card.stampCount;
    let availableRewards = card.availableRewards;
    let completedCycles = card.completedCycles;
    const total = Math.max(1, program.totalStamps);

    for (let i = 0; i < input.amount; i++) {
      nextCount += 1;
      if (nextCount >= total) {
        availableRewards += 1;
        completedCycles += 1;
        nextCount = 0;
      }
      await tx.stamp.create({
        data: {
          cardId: card.id,
          programId: input.programId,
          merchantId: input.merchantId,
          customerId: input.customerId,
          issuedById: input.issuedById,
          offlineId: `${input.offlinePrefix}-${input.customerId}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        },
      });
    }

    await tx.loyaltyCard.update({
      where: { id: card.id },
      data: { stampCount: nextCount, availableRewards, completedCycles },
    });
  }
}
