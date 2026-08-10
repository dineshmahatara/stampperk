import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createCampaignSchema, REWARD_CAMPAIGN_TYPES, updateCampaignSchema } from '@stampz/shared';
import { CampaignStatus, OfferType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingCatalogService } from '../pricing/pricing-catalog.service';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pricingCatalog: PricingCatalogService,
  ) {}

  async create(ownerId: string, raw: unknown) {
    const data = createCampaignSchema.parse(raw);
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId },
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Owner required');

    const limits = this.pricingCatalog.planLimits(merchant.subscription?.plan);
    const count = await this.prisma.campaign.count({ where: { merchantId: merchant.id } });
    if (count >= limits.campaigns) {
      throw new ForbiddenException('Campaign limit reached for your plan');
    }

    const preset = data.campaignPreset
      ? REWARD_CAMPAIGN_TYPES.find((p) => p.id === data.campaignPreset)
      : undefined;

    const campaign = await this.prisma.campaign.create({
      data: {
        merchantId: merchant.id,
        title: data.title || preset?.label || 'Campaign',
        description: data.description || preset?.description || '',
        badgeText: data.badgeText || preset?.badge || 'OFFER',
        offerType: (data.offerType || preset?.offerType || 'PERCENTAGE') as OfferType,
        discountValue: data.discountValue,
        imageUrl: data.imageUrl || null,
        status: data.status as CampaignStatus,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        campaignPreset: data.campaignPreset || null,
      },
    });

    if (campaign.status === 'ACTIVE') {
      const cardHolders = await this.prisma.loyaltyCard.findMany({
        where: { program: { merchantId: merchant.id } },
        select: { customerId: true },
        distinct: ['customerId'],
      });
      await Promise.all(
        cardHolders.map((c) =>
          this.notifications.create(c.customerId, {
            title: 'New offer',
            body: `${merchant.businessName}: ${campaign.title}`,
            type: 'NEW_OFFER',
            dataJson: { campaignId: campaign.id },
          }),
        ),
      );
    }

    return campaign;
  }

  async discoverForCustomer(customerId: string) {
    const cards = await this.prisma.loyaltyCard.findMany({
      where: { customerId },
      select: { program: { select: { merchantId: true } } },
    });
    const merchantIds = [...new Set(cards.map((c) => c.program.merchantId))];
    return this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        ...(merchantIds.length ? { merchantId: { in: merchantIds } } : {}),
      },
      include: {
        merchant: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async list(userId: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ ownerId: userId }, { staff: { some: { userId, active: true } } }],
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    const campaigns = await this.prisma.campaign.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      stats: {
        total: campaigns.length,
        active: campaigns.filter((c) => c.status === 'ACTIVE').length,
        views: campaigns.reduce((s, c) => s + c.views, 0),
        clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      },
      campaigns,
    };
  }

  async publish(ownerId: string, id: string) {
    const merchant = await this.prisma.merchant.findFirst({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
    if (!merchant) throw new ForbiddenException('Owner required');
    const updated = await this.prisma.campaign.updateMany({
      where: { id, merchantId: merchant.id },
      data: { status: 'ACTIVE' },
    });
    if (!updated.count) throw new NotFoundException('Campaign not found');
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  async update(ownerId: string, id: string, raw: unknown) {
    const data = updateCampaignSchema.parse(raw);
    const merchant = await this.prisma.merchant.findFirst({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
    if (!merchant) throw new ForbiddenException('Owner required');
    const existing = await this.prisma.campaign.findFirst({
      where: { id, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Campaign not found');
    return this.prisma.campaign.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        badgeText: data.badgeText,
        offerType: data.offerType as OfferType | undefined,
        discountValue: data.discountValue,
        imageUrl: data.imageUrl,
        status: data.status as CampaignStatus | undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    const merchant = await this.prisma.merchant.findFirst({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
    if (!merchant) throw new ForbiddenException('Owner required');
    const existing = await this.prisma.campaign.findFirst({
      where: { id, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Campaign not found');
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }
}
