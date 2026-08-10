import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrivacyService {
  constructor(private prisma: PrismaService) {}

  async requestExport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        loyaltyCards: { include: { program: true, stamps: true, redemptions: true } },
        notifications: true,
        ownedMerchants: true,
      },
    });

    const request = await this.prisma.dataExportRequest.create({
      data: {
        userId,
        status: 'COMPLETED',
        completedAt: new Date(),
        downloadUrl: null,
      },
    });

    return {
      requestId: request.id,
      status: 'COMPLETED',
      exportedAt: new Date().toISOString(),
      data: user,
      note: 'GDPR Article 15 data export. Store securely; do not share.',
    };
  }

  async deleteAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted-${userId}@stampz.invalid`,
          name: 'Deleted User',
          phone: null,
          alternatePhone: null,
          photoUrl: null,
          dateOfBirth: null,
          gender: null,
          province: null,
          district: null,
          city: null,
          municipality: null,
          ward: null,
          streetAddress: null,
          postalCode: null,
          passwordHash: 'deleted',
          marketingConsent: false,
          pushConsent: false,
        },
      });
      await tx.auditLog.create({
        data: { userId, action: 'ACCOUNT_DELETE', entityType: 'User', entityId: userId },
      });
    });
    return { ok: true, message: 'Account scheduled for deletion / anonymized (GDPR).' };
  }

  updateConsent(userId: string, body: { marketingConsent?: boolean; pushConsent?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        marketingConsent: body.marketingConsent,
        pushConsent: body.pushConsent,
      },
      select: { id: true, marketingConsent: true, pushConsent: true },
    });
  }
}
