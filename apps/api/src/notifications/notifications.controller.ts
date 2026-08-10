import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

function mid(headers: Record<string, string | undefined>) {
  return headers['x-merchant-id'] || headers['X-Merchant-Id'] || undefined;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.notifications.list(req.user.id);
  }

  @Patch(':id/read')
  read(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Post('devices')
  registerDevice(
    @Req() req: { user: { id: string } },
    @Body() body: { token: string; platform: string },
  ) {
    return this.notifications.registerDevice(req.user.id, body.token, body.platform);
  }

  @Get('merchant/sends')
  listSends(@Req() req: { user: { id: string } }, @Headers() headers: Record<string, string | undefined>) {
    return this.notifications.listMerchantSends(req.user.id, mid(headers));
  }

  @Post('merchant/estimate')
  estimate(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.notifications.estimateAudience(req.user.id, body, mid(headers));
  }

  @Post('merchant/send')
  send(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.notifications.sendMerchantPush(req.user.id, body, mid(headers));
  }

  @Get('merchant/announcements')
  listAnnouncements(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.notifications.listAnnouncements(req.user.id, mid(headers));
  }

  @Post('merchant/announcements')
  createAnnouncement(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.notifications.createAnnouncement(req.user.id, body, mid(headers));
  }

  @Post('merchant/announcements/:id/publish')
  publishAnnouncement(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    return this.notifications.publishAnnouncement(req.user.id, id, mid(headers));
  }
}
