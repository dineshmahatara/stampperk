import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminBrandingController, BrandingController } from './branding.controller';
import { AdminService } from './admin.service';
import { LeafletsModule } from '../leaflets/leaflets.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [LeafletsModule, NotificationsModule],
  controllers: [AdminController, BrandingController, AdminBrandingController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
