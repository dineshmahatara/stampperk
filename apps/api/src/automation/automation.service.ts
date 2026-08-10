import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AutomationAction, AutomationTrigger, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Run shortly after boot, then about once per day.
    this.timer = setInterval(() => void this.runAll(), 24 * 60 * 60 * 1000);
    setTimeout(() => void this.runAll(), 15_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async ensureDefaultRules(merchantId: string) {
    const existing = await this.prisma.automationRule.count({ where: { merchantId } });
    if (existing > 0) return;
    await this.prisma.automationRule.createMany({
      data: [
        {
          merchantId,
          name: 'Win-back 30 days',
          trigger: AutomationTrigger.WIN_BACK_30,
          action: AutomationAction.COUPON_AND_PUSH,
          active: true,
        },
        {
          merchantId,
          name: 'Birthday greeting',
          trigger: AutomationTrigger.BIRTHDAY,
          action: AutomationAction.COUPON_AND_PUSH,
          active: true,
        },
        {
          merchantId,
          name: 'Near reward reminder',
          trigger: AutomationTrigger.NEAR_REWARD,
          action: AutomationAction.PUSH,
          active: true,
        },
      ],
    });
  }

  listRules(merchantId: string) {
    return this.prisma.automationRule.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setRuleActive(merchantId: string, id: string, active: boolean) {
    await this.ensureDefaultRules(merchantId);
    return this.prisma.automationRule.updateMany({
      where: { id, merchantId },
      data: { active },
    });
  }

  async runAll() {
    if (this.running) return { skipped: true };
    this.running = true;
    try {
      const merchants = await this.prisma.merchant.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, businessName: true },
        take: 500,
      });
      let fired = 0;
      for (const m of merchants) {
        await this.ensureDefaultRules(m.id);
        fired += await this.runMerchant(m.id, m.businessName);
      }
      this.logger.log(`Automation run complete — ${fired} actions`);
      return { merchants: merchants.length, fired };
    } finally {
      this.running = false;
    }
  }

  async runForMerchant(merchantId: string, businessName: string) {
    await this.ensureDefaultRules(merchantId);
    return this.runMerchant(merchantId, businessName);
  }

  private async runMerchant(merchantId: string, businessName: string) {
    const rules = await this.prisma.automationRule.findMany({
      where: { merchantId, active: true },
    });
    let fired = 0;
    for (const rule of rules) {
      if (rule.trigger === AutomationTrigger.WIN_BACK_30) {
        fired += await this.runWinBack(rule.id, merchantId, businessName, rule.action);
      } else if (rule.trigger === AutomationTrigger.BIRTHDAY) {
        fired += await this.runBirthday(rule.id, merchantId, businessName, rule.action);
      } else if (rule.trigger === AutomationTrigger.NEAR_REWARD) {
        fired += await this.runNearReward(rule.id, merchantId, businessName);
      }
    }
    return fired;
  }

  private async alreadyRanToday(ruleId: string, customerId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const n = await this.prisma.automationRun.count({
      where: { ruleId, customerId, createdAt: { gte: start } },
    });
    return n > 0;
  }

  private async logRun(ruleId: string, merchantId: string, customerId: string, detail: string) {
    await this.prisma.automationRun.create({
      data: { ruleId, merchantId, customerId, status: 'OK', detail },
    });
  }

  private async maybeCoupon(
    merchantId: string,
    _customerId: string,
    type: 'PERCENT' | 'BIRTHDAY' | 'REFERRAL',
    title: string,
    codePrefix: string,
  ) {
    const code = `${codePrefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const coupon = await this.prisma.coupon.create({
      data: {
        merchantId,
        code,
        title,
        type,
        value: type === 'BIRTHDAY' ? 15 : 10,
        expiresAt: new Date(Date.now() + 14 * 86400000),
        usageLimit: 1,
        active: true,
        segment: 'ALL',
      },
    });
    return coupon;
  }

  private async runWinBack(
    ruleId: string,
    merchantId: string,
    businessName: string,
    action: AutomationAction,
  ) {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const cards = await this.prisma.loyaltyCard.findMany({
      where: {
        program: { merchantId },
        updatedAt: { lt: cutoff },
      },
      include: {
        customer: { select: { id: true, name: true } },
        stamps: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      take: 80,
    });
    let fired = 0;
    for (const card of cards) {
      const last = card.stamps[0]?.createdAt || card.updatedAt;
      if (last > cutoff) continue;
      if (await this.alreadyRanToday(ruleId, card.customerId)) continue;
      let couponCode = '';
      if (action === AutomationAction.COUPON_AND_PUSH) {
        const c = await this.maybeCoupon(
          merchantId,
          card.customerId,
          'PERCENT',
          'We miss you — 10% off',
          'MISS',
        );
        couponCode = c.code;
      }
      await this.notifications.create(card.customerId, {
        title: `We miss you at ${businessName}`,
        body: couponCode
          ? `It's been a while! Use code ${couponCode} for 10% off.`
          : `Come back soon — we'd love to see you again.`,
        type: NotificationType.NEW_OFFER,
        dataJson: { merchantId, couponCode },
      });
      await this.logRun(ruleId, merchantId, card.customerId, couponCode || 'push');
      fired += 1;
    }
    return fired;
  }

  private async runBirthday(
    ruleId: string,
    merchantId: string,
    businessName: string,
    action: AutomationAction,
  ) {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    const cards = await this.prisma.loyaltyCard.findMany({
      where: { program: { merchantId } },
      include: {
        customer: { select: { id: true, name: true, dateOfBirth: true } },
      },
      take: 500,
    });
    let fired = 0;
    for (const card of cards) {
      const dob = card.customer.dateOfBirth;
      if (!dob) continue;
      if (dob.getMonth() !== month || dob.getDate() !== day) continue;
      if (await this.alreadyRanToday(ruleId, card.customerId)) continue;
      let couponCode = '';
      if (action === AutomationAction.COUPON_AND_PUSH) {
        const c = await this.maybeCoupon(
          merchantId,
          card.customerId,
          'BIRTHDAY',
          'Happy Birthday!',
          'BDAY',
        );
        couponCode = c.code;
      }
      await this.notifications.create(card.customerId, {
        title: `Happy Birthday from ${businessName}!`,
        body: couponCode
          ? `Enjoy ${couponCode} — 15% off your next visit.`
          : `Wishing you a wonderful birthday!`,
        type: NotificationType.BIRTHDAY,
        dataJson: { merchantId, couponCode },
      });
      await this.logRun(ruleId, merchantId, card.customerId, couponCode || 'push');
      fired += 1;
    }
    return fired;
  }

  private async runNearReward(ruleId: string, merchantId: string, businessName: string) {
    const cards = await this.prisma.loyaltyCard.findMany({
      where: { program: { merchantId, active: true } },
      include: {
        customer: { select: { id: true, name: true } },
        program: { select: { totalStamps: true, rewardTitle: true } },
      },
      take: 300,
    });
    let fired = 0;
    for (const card of cards) {
      const remaining = card.program.totalStamps - card.stampCount;
      if (remaining <= 0 || remaining > 2) continue;
      if (await this.alreadyRanToday(ruleId, card.customerId)) continue;
      await this.notifications.create(card.customerId, {
        title: `Almost there at ${businessName}`,
        body: `Only ${remaining} stamp${remaining === 1 ? '' : 's'} until ${card.program.rewardTitle}!`,
        type: NotificationType.REWARD_READY,
        dataJson: { merchantId, remaining },
      });
      await this.logRun(ruleId, merchantId, card.customerId, `remaining=${remaining}`);
      fired += 1;
    }
    return fired;
  }
}
