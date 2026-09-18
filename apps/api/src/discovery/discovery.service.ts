import { Injectable } from '@nestjs/common';
import { BUSINESS_CATEGORY_TREE, isMerchantVerifiedLive } from '@stampperk/shared';
import { PrismaService } from '../prisma/prisma.service';

type CatGroup = (typeof BUSINESS_CATEGORY_TREE)[number];

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) {}

  async search(params: {
    q?: string;
    category?: string;
    groupId?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    locale?: string;
    verifiedOnly?: boolean;
  }) {
    const merchants = await this.prisma.merchant.findMany({
      where: {
        status: 'ACTIVE',
        ...(params.category && !params.groupId
          ? { category: { contains: params.category } }
          : {}),
        ...(params.q
          ? {
              OR: [
                { businessName: { contains: params.q } },
                { description: { contains: params.q } },
                { city: { contains: params.q } },
                { category: { contains: params.q } },
              ],
            }
          : {}),
      },
      include: {
        loyaltyPrograms: { where: { active: true }, take: 1 },
        campaigns: { where: { status: 'ACTIVE' }, take: 2 },
        subscription: {
          select: { verifiedAddon: true, verifiedUntil: true },
        },
      },
      take: 80,
    });

    const withDistance = merchants.map((m) => {
      let distanceKm: number | null = null;
      if (params.lat != null && params.lng != null && m.latitude != null && m.longitude != null) {
        distanceKm = this.haversine(params.lat, params.lng, m.latitude, m.longitude);
      }
      const verified = isMerchantVerifiedLive({
        verificationStatus: m.verificationStatus,
        verifiedAddon: m.subscription?.verifiedAddon,
        verifiedUntil: m.subscription?.verifiedUntil,
      });
      return { ...m, distanceKm, verified };
    });

    let filtered =
      params.lat != null && params.lng != null && params.radiusKm
        ? withDistance.filter((m) => m.distanceKm != null && m.distanceKm <= params.radiusKm!)
        : withDistance;

    if (params.groupId) {
      const group = BUSINESS_CATEGORY_TREE.find((g) => g.id === params.groupId);
      if (group) {
        filtered = filtered.filter((m) => this.matchesGroup(m.category, m.businessName, group));
      }
    }

    if (params.verifiedOnly) {
      filtered = filtered.filter((m) => m.verified);
    }

    filtered.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return {
      locale: params.locale || 'en',
      unit: 'km',
      results: filtered.slice(0, 50),
    };
  }

  /**
   * Dynamic discovery categories: shared tree + live merchant counts
   * (optionally scoped to nearby radius).
   */
  async categories(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    locale?: string;
  }) {
    const locale = params.locale === 'ne' ? 'ne' : 'en';
    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        category: true,
        businessName: true,
        latitude: true,
        longitude: true,
      },
    });

    const nearby = merchants.filter((m) => {
      if (params.lat == null || params.lng == null || params.radiusKm == null) return true;
      if (m.latitude == null || m.longitude == null) return false;
      return this.haversine(params.lat, params.lng, m.latitude, m.longitude) <= params.radiusKm;
    });

    const groups = BUSINESS_CATEGORY_TREE.map((g) => {
      const count = nearby.filter((m) => this.matchesGroup(m.category, m.businessName, g)).length;
      return {
        id: g.id,
        label: { en: g.label, ne: g.label },
        displayLabel: g.label,
        merchantCount: count,
        children: g.children.map((c) => ({
          id: c.id,
          label: { en: c.label, ne: c.label },
        })),
      };
    });

    // Distinct free-text categories merchants actually use
    const usedLabels = [
      ...new Set(nearby.map((m) => (m.category || '').trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    const withMerchants = groups.filter((g) => g.merchantCount > 0);
    const empty = groups.filter((g) => g.merchantCount === 0);

    return {
      locale,
      totalMerchants: nearby.length,
      /** Prefer groups that currently have merchants (dynamic order). */
      groups: [...withMerchants, ...empty],
      usedLabels,
    };
  }

  private matchesGroup(category: string | null | undefined, businessName: string, group: CatGroup) {
    const hay = `${category || ''} ${businessName || ''}`.toLowerCase();
    if (!hay.trim()) return false;
    const needles = [
      group.id.replace(/-/g, ' '),
      group.label.toLowerCase(),
      ...group.children.map((c) => c.label.toLowerCase()),
      ...group.children.map((c) => c.id.replace(/-/g, ' ')),
      ...group.children.map((c) => c.label.toLowerCase().split(/[\s&/]+/)[0]).filter((w) => w.length > 2),
    ];
    // Food & beverage soft matches for common free-text like "Coffee"
    if (group.id === 'food-beverage') {
      needles.push(
        'coffee',
        'cafe',
        'tea',
        'restaurant',
        'food',
        'bakery',
        'pizza',
        'bar',
        'juice',
        'drink',
        'choc',
        'beverage',
      );
    }
    return needles.some((n) => n && hay.includes(n));
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
