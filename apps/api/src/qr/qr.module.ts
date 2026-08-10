import { Module, forwardRef } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [forwardRef(() => NotificationsModule), forwardRef(() => ReferralsModule)],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
