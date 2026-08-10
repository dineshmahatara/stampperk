import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  BILLING_REGIONS,
  PLAN_DISPLAY_NAMES,
  PLAN_LIMITS,
  billingRegionFromCountry,
  type BillingRegion,
  type BillingRegionCode,
} from '@stampz/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PLAN_COPY,
  defaultPlans,
  defaultRegions,
  type PlanCatalogId,
  type PlanCatalogRow,
  type RegionCatalogRow,
} from './default-catalog';

export type PricingCatalogPayload = {
  regions: RegionCatalogRow[];
  plans: PlanCatalogRow[];
};

type PlanLimits = {
  businesses: number;
  loyaltyCards: number;
  stampsPerMonth: number;
  campaigns: number;
  branches: number;
  galleryPhotos: number;
  staff: number;
  displayName: string;
};

@Injectable()
export class PricingCatalogService implements OnModuleInit {
  private regions = new Map<string, RegionCatalogRow>();
  private plans = new Map<string, PlanCatalogRow>();
  private ready = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  private parseFeatures(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch {
        return raw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private rowFromDbPlan(p: {
    planId: string;
    displayName: string;
    label: string;
    title: string;
    description: string;
    features: unknown;
    priceNote: string | null;
    cta: string | null;
    footer: string | null;
    businesses: number;
    loyaltyCards: number;
    stampsPerMonth: number;
    campaigns: number;
    branches: number;
    galleryPhotos: number;
    staff: number;
  }): PlanCatalogRow {
    return {
      planId: p.planId as PlanCatalogId,
      displayName: p.displayName,
      label: p.label,
      title: p.title,
      description: p.description,
      features: this.parseFeatures(p.features),
      priceNote: p.priceNote,
      cta: p.cta,
      footer: p.footer,
      businesses: p.businesses,
      loyaltyCards: p.loyaltyCards,
      stampsPerMonth: p.stampsPerMonth,
      campaigns: p.campaigns,
      branches: p.branches,
      galleryPhotos: p.galleryPhotos,
      staff: p.staff,
    };
  }

  async ensureSeeded() {
    const [regionCount, planCount] = await Promise.all([
      this.prisma.pricingRegionConfig.count(),
      this.prisma.planCatalog.count(),
    ]);

    if (regionCount === 0) {
      for (const r of defaultRegions()) {
        await this.prisma.pricingRegionConfig.create({ data: r });
      }
    }
    if (planCount === 0) {
      for (const p of defaultPlans()) {
        await this.prisma.planCatalog.create({
          data: {
            ...p,
            features: p.features,
          },
        });
      }
    }
  }

  async refreshCache() {
    await this.ensureSeeded();
    const [regions, plans] = await Promise.all([
      this.prisma.pricingRegionConfig.findMany({ orderBy: { regionCode: 'asc' } }),
      this.prisma.planCatalog.findMany(),
    ]);

    this.regions.clear();
    for (const r of regions) {
      this.regions.set(r.regionCode, {
        regionCode: r.regionCode as BillingRegionCode,
        currency: r.currency,
        label: r.label,
        monthlyAmount: r.monthlyAmount,
        yearlyAmount: r.yearlyAmount,
        yearlyWasAmount: r.yearlyWasAmount,
        trialDays: r.trialDays,
      });
    }

    this.plans.clear();
    for (const p of plans) {
      this.plans.set(p.planId, this.rowFromDbPlan(p));
    }

    // Fill any missing keys from defaults so runtime never crashes
    for (const r of defaultRegions()) {
      if (!this.regions.has(r.regionCode)) this.regions.set(r.regionCode, r);
    }
    for (const p of defaultPlans()) {
      if (!this.plans.has(p.planId)) this.plans.set(p.planId, p);
    }

    this.ready = true;
  }

  private ensureReadySync() {
    if (!this.ready) {
      // Fallback until onModuleInit finishes
      for (const r of defaultRegions()) this.regions.set(r.regionCode, r);
      for (const p of defaultPlans()) this.plans.set(p.planId, p);
      this.ready = true;
    }
  }

  getCatalog(): PricingCatalogPayload {
    this.ensureReadySync();
    return {
      regions: Array.from(this.regions.values()).sort((a, b) =>
        a.regionCode.localeCompare(b.regionCode),
      ),
      plans: (['FREE', 'MONTHLY', 'YEARLY'] as PlanCatalogId[])
        .map((id) => this.plans.get(id)!)
        .filter(Boolean),
    };
  }

  async getCatalogFresh(): Promise<PricingCatalogPayload> {
    await this.refreshCache();
    return this.getCatalog();
  }

  regionFromCountry(country?: string | null): BillingRegion {
    this.ensureReadySync();
    const base = billingRegionFromCountry(country);
    const row = this.regions.get(base.code);
    if (!row) return base;
    return {
      code: row.regionCode,
      currency: row.currency,
      label: row.label,
      monthlyAmount: row.monthlyAmount,
      yearlyAmount: row.yearlyAmount,
      yearlyWasAmount: row.yearlyWasAmount,
    };
  }

  getRegion(code: BillingRegionCode | string): RegionCatalogRow {
    this.ensureReadySync();
    const existing = this.regions.get(code);
    if (existing) return existing;
    const fromDefault = defaultRegions().find((r) => r.regionCode === code);
    if (fromDefault) return fromDefault;
    const us = BILLING_REGIONS.US;
    return {
      regionCode: 'US',
      currency: us.currency,
      label: us.label,
      monthlyAmount: us.monthlyAmount,
      yearlyAmount: us.yearlyAmount,
      yearlyWasAmount: us.yearlyWasAmount,
      trialDays: 14,
    };
  }

  getTrialDays(country?: string | null): number {
    const region = this.regionFromCountry(country);
    return this.getRegion(region.code).trialDays ?? 14;
  }

  planLimits(plan?: string | null): PlanLimits {
    this.ensureReadySync();
    const id = (plan || 'FREE') as PlanCatalogId;
    const row = this.plans.get(id) || this.plans.get('FREE')!;
    const fallback = PLAN_LIMITS[id] || PLAN_LIMITS.FREE;
    return {
      businesses: row?.businesses ?? fallback.businesses,
      loyaltyCards: row?.loyaltyCards ?? fallback.loyaltyCards,
      stampsPerMonth: row?.stampsPerMonth ?? fallback.stampsPerMonth,
      campaigns: row?.campaigns ?? fallback.campaigns,
      branches: row?.branches ?? fallback.branches,
      galleryPhotos: row?.galleryPhotos ?? fallback.galleryPhotos,
      staff: row?.staff ?? fallback.staff,
      displayName: row?.displayName || PLAN_DISPLAY_NAMES[id] || id,
    };
  }

  effectivePlanLimits(sub?: {
    plan?: string | null;
    extraBranches?: number | null;
    extraStaff?: number | null;
  } | null) {
    const base = this.planLimits(sub?.plan);
    return {
      ...base,
      branches: base.branches + (sub?.extraBranches || 0),
      staff: base.staff + (sub?.extraStaff || 0),
    };
  }

  getPlanCopy(planId: PlanCatalogId | string): PlanCatalogRow {
    this.ensureReadySync();
    const id = planId as PlanCatalogId;
    return this.plans.get(id) || defaultPlans().find((p) => p.planId === id)!;
  }

  async updateCatalog(
    body: {
      regions?: Array<Partial<RegionCatalogRow> & { regionCode: string }>;
      plans?: Array<Partial<PlanCatalogRow> & { planId: string }>;
    },
  ): Promise<PricingCatalogPayload> {
    await this.ensureSeeded();

    if (body.regions?.length) {
      for (const r of body.regions) {
        const code = String(r.regionCode || '').toUpperCase();
        if (!BILLING_REGIONS[code as BillingRegionCode] && !this.regions.has(code)) {
          throw new BadRequestException(`Unknown region: ${code}`);
        }
        const existing = this.regions.get(code) || defaultRegions().find((x) => x.regionCode === code);
        const currency = existing?.currency || BILLING_REGIONS[code as BillingRegionCode]?.currency;
        if (!currency) throw new BadRequestException(`Unknown region: ${code}`);

        await this.prisma.pricingRegionConfig.upsert({
          where: { regionCode: code },
          create: {
            regionCode: code,
            currency,
            label: r.label ?? existing?.label ?? code,
            monthlyAmount: Number(r.monthlyAmount ?? existing?.monthlyAmount ?? 0),
            yearlyAmount: Number(r.yearlyAmount ?? existing?.yearlyAmount ?? 0),
            yearlyWasAmount: Number(r.yearlyWasAmount ?? existing?.yearlyWasAmount ?? 0),
            trialDays: Math.max(0, Number(r.trialDays ?? existing?.trialDays ?? 14)),
          },
          update: {
            label: r.label ?? undefined,
            monthlyAmount:
              r.monthlyAmount !== undefined ? Number(r.monthlyAmount) : undefined,
            yearlyAmount: r.yearlyAmount !== undefined ? Number(r.yearlyAmount) : undefined,
            yearlyWasAmount:
              r.yearlyWasAmount !== undefined ? Number(r.yearlyWasAmount) : undefined,
            trialDays: r.trialDays !== undefined ? Math.max(0, Number(r.trialDays)) : undefined,
          },
        });
      }
    }

    if (body.plans?.length) {
      for (const p of body.plans) {
        const planId = String(p.planId || '').toUpperCase();
        if (!['FREE', 'MONTHLY', 'YEARLY'].includes(planId)) {
          throw new BadRequestException(`Unknown plan: ${planId}`);
        }
        const existing = this.plans.get(planId) || defaultPlans().find((x) => x.planId === planId)!;
        const features =
          p.features !== undefined
            ? Array.isArray(p.features)
              ? p.features.map(String).filter(Boolean)
              : this.parseFeatures(p.features)
            : existing.features;

        const intOr = (v: unknown, fallback: number) => {
          if (v === undefined || v === null || v === '') return fallback;
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`Invalid limit for ${planId}`);
          return Math.floor(n);
        };

        await this.prisma.planCatalog.upsert({
          where: { planId },
          create: {
            planId,
            displayName: p.displayName ?? existing.displayName,
            label: p.label ?? existing.label,
            title: p.title ?? existing.title,
            description: p.description ?? existing.description,
            features,
            priceNote: p.priceNote ?? existing.priceNote,
            cta: p.cta ?? existing.cta,
            footer: p.footer ?? existing.footer,
            businesses: intOr(p.businesses, existing.businesses),
            loyaltyCards: intOr(p.loyaltyCards, existing.loyaltyCards),
            stampsPerMonth: intOr(p.stampsPerMonth, existing.stampsPerMonth),
            campaigns: intOr(p.campaigns, existing.campaigns),
            branches: intOr(p.branches, existing.branches),
            galleryPhotos: intOr(p.galleryPhotos, existing.galleryPhotos),
            staff: intOr(p.staff, existing.staff),
          },
          update: {
            displayName: p.displayName ?? undefined,
            label: p.label ?? undefined,
            title: p.title ?? undefined,
            description: p.description ?? undefined,
            features: p.features !== undefined ? features : undefined,
            priceNote: p.priceNote !== undefined ? p.priceNote : undefined,
            cta: p.cta !== undefined ? p.cta : undefined,
            footer: p.footer !== undefined ? p.footer : undefined,
            businesses: p.businesses !== undefined ? intOr(p.businesses, existing.businesses) : undefined,
            loyaltyCards:
              p.loyaltyCards !== undefined ? intOr(p.loyaltyCards, existing.loyaltyCards) : undefined,
            stampsPerMonth:
              p.stampsPerMonth !== undefined
                ? intOr(p.stampsPerMonth, existing.stampsPerMonth)
                : undefined,
            campaigns: p.campaigns !== undefined ? intOr(p.campaigns, existing.campaigns) : undefined,
            branches: p.branches !== undefined ? intOr(p.branches, existing.branches) : undefined,
            galleryPhotos:
              p.galleryPhotos !== undefined ? intOr(p.galleryPhotos, existing.galleryPhotos) : undefined,
            staff: p.staff !== undefined ? intOr(p.staff, existing.staff) : undefined,
          },
        });
      }
    }

    return this.getCatalogFresh();
  }

  /** Public billing/pricing payload helpers */
  publicPlanCards() {
    this.ensureReadySync();
    const mapKey = { FREE: 'free', MONTHLY: 'monthly', YEARLY: 'yearly' } as const;
    const out: Record<string, unknown> = {};
    for (const id of ['FREE', 'MONTHLY', 'YEARLY'] as PlanCatalogId[]) {
      const p = this.getPlanCopy(id);
      const copy = DEFAULT_PLAN_COPY[id];
      out[mapKey[id]] = {
        plan: id,
        displayName: p.displayName,
        label: p.label || copy.label,
        title: p.title || copy.title,
        description: p.description || copy.description,
        features: p.features?.length ? p.features : copy.features,
        priceNote: p.priceNote ?? copy.priceNote,
        cta: p.cta ?? copy.cta,
        footer: p.footer ?? copy.footer,
        limits: {
          businesses: p.businesses,
          loyaltyCards: p.loyaltyCards,
          stampsPerMonth: p.stampsPerMonth,
          campaigns: p.campaigns,
          branches: p.branches,
          galleryPhotos: p.galleryPhotos,
          staff: p.staff,
        },
      };
    }
    return out;
  }
}
