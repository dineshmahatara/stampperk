import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  createLeafletTemplateSchema,
  createMerchantLeafletSchema,
  updateLeafletTemplateSchema,
  updateMerchantLeafletSchema,
  LEAFLET_LAYOUT_IDS,
  UserRole,
} from '@stampperk/shared';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeafletsService {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(role: string) {
    if (role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Admin only');
  }

  private newToken() {
    return randomBytes(12).toString('hex');
  }

  private async requireOwner(userId: string, merchantId?: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId: userId, ...(merchantId ? { id: merchantId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    if (!merchant) throw new ForbiddenException('Owner access required');
    return merchant;
  }

  // ——— Admin templates ———

  listTemplatesAdmin(role: string) {
    this.assertAdmin(role);
    return this.prisma.leafletTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { leaflets: true } } },
    });
  }

  async createTemplate(role: string, raw: unknown) {
    this.assertAdmin(role);
    const data = createLeafletTemplateSchema.parse(raw);
    if (!(LEAFLET_LAYOUT_IDS as readonly string[]).includes(data.layoutId)) {
      throw new BadRequestException('Invalid layoutId');
    }
    return this.prisma.leafletTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        previewUrl: data.previewUrl || null,
        layoutId: data.layoutId,
        categoryTags: data.categoryTags || null,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateTemplate(role: string, id: string, raw: unknown) {
    this.assertAdmin(role);
    const data = updateLeafletTemplateSchema.parse(raw);
    const existing = await this.prisma.leafletTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    if (data.layoutId && !(LEAFLET_LAYOUT_IDS as readonly string[]).includes(data.layoutId)) {
      throw new BadRequestException('Invalid layoutId');
    }
    return this.prisma.leafletTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description || null,
        previewUrl: data.previewUrl === undefined ? undefined : data.previewUrl || null,
        layoutId: data.layoutId,
        categoryTags: data.categoryTags === undefined ? undefined : data.categoryTags || null,
        active: data.active,
        sortOrder: data.sortOrder,
      },
    });
  }

  // ——— Merchant ———

  listActiveTemplates() {
    return this.prisma.leafletTemplate.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listMine(userId: string, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    return this.prisma.merchantLeaflet.findMany({
      where: { merchantId: merchant.id },
      include: { template: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, raw: unknown, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const data = createMerchantLeafletSchema.parse(raw);
    const template = await this.prisma.leafletTemplate.findFirst({
      where: { id: data.templateId, active: true },
    });
    if (!template) throw new NotFoundException('Template not found or inactive');

    return this.prisma.merchantLeaflet.create({
      data: {
        merchantId: merchant.id,
        templateId: template.id,
        headline: data.headline,
        offerText: data.offerText,
        promoImageUrl: data.promoImageUrl || null,
        logoUrl: data.logoUrl || merchant.logoUrl || null,
        phone: data.phone || merchant.phone || null,
        address:
          data.address ||
          [merchant.address, merchant.city].filter(Boolean).join(', ') ||
          null,
        accentColor: data.accentColor || null,
        published: data.published ?? false,
        publicToken: this.newToken(),
      },
      include: { template: true },
    });
  }

  async update(userId: string, id: string, raw: unknown, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const existing = await this.prisma.merchantLeaflet.findFirst({
      where: { id, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Leaflet not found');
    const data = updateMerchantLeafletSchema.parse(raw);

    if (data.templateId) {
      const template = await this.prisma.leafletTemplate.findFirst({
        where: { id: data.templateId, active: true },
      });
      if (!template) throw new NotFoundException('Template not found or inactive');
    }

    return this.prisma.merchantLeaflet.update({
      where: { id },
      data: {
        templateId: data.templateId,
        headline: data.headline,
        offerText: data.offerText,
        promoImageUrl: data.promoImageUrl === undefined ? undefined : data.promoImageUrl || null,
        logoUrl: data.logoUrl === undefined ? undefined : data.logoUrl || null,
        phone: data.phone === undefined ? undefined : data.phone || null,
        address: data.address === undefined ? undefined : data.address || null,
        accentColor: data.accentColor === undefined ? undefined : data.accentColor || null,
        published: data.published,
      },
      include: { template: true },
    });
  }

  async remove(userId: string, id: string, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const existing = await this.prisma.merchantLeaflet.findFirst({
      where: { id, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Leaflet not found');
    await this.prisma.merchantLeaflet.delete({ where: { id } });
    return { ok: true };
  }

  async publish(userId: string, id: string, published: boolean, merchantId?: string) {
    const merchant = await this.requireOwner(userId, merchantId);
    const existing = await this.prisma.merchantLeaflet.findFirst({
      where: { id, merchantId: merchant.id },
    });
    if (!existing) throw new NotFoundException('Leaflet not found');
    return this.prisma.merchantLeaflet.update({
      where: { id },
      data: { published },
      include: { template: true },
    });
  }

  // ——— Public ———

  async getPublic(token: string) {
    const leaflet = await this.prisma.merchantLeaflet.findFirst({
      where: { publicToken: token, published: true },
      include: {
        template: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
            phone: true,
            address: true,
            city: true,
            tagline: true,
            status: true,
          },
        },
      },
    });
    if (!leaflet || leaflet.merchant.status !== 'ACTIVE') {
      throw new NotFoundException('Leaflet not found');
    }
    return leaflet;
  }
}
