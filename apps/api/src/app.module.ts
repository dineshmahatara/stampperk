import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MerchantsModule } from './merchants/merchants.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { QrModule } from './qr/qr.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { PrivacyModule } from './privacy/privacy.module';
import { MediaModule } from './media/media.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LeafletsModule } from './leaflets/leaflets.module';
import { AutomationModule } from './automation/automation.module';
import { PricingModule } from './pricing/pricing.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Monorepo may start from repo root; always load apps/api/.env too.
      envFilePath: [
        join(__dirname, '..', '.env'),
        join(process.cwd(), 'apps', 'api', '.env'),
        join(process.cwd(), '.env'),
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    PricingModule,
    AuthModule,
    UsersModule,
    MerchantsModule,
    LoyaltyModule,
    QrModule,
    CampaignsModule,
    NotificationsModule,
    BillingModule,
    AdminModule,
    DiscoveryModule,
    PrivacyModule,
    MediaModule,
    ReferralsModule,
    LeafletsModule,
    AutomationModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
