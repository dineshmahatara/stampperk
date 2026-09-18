import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ReferralsModule } from '../referrals/referrals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '30d' },
    }),
    forwardRef(() => ReferralsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => MerchantsModule),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
