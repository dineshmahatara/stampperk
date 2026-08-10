import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { QrService } from './qr.service';

function merchantHeader(headers: Record<string, string | string[] | undefined>) {
  const v = headers['x-merchant-id'] || headers['X-Merchant-Id'];
  return typeof v === 'string' ? v : undefined;
}

@Controller('qr')
export class QrController {
  constructor(private qr: QrService) {}

  @Get('me')
  myQr(@Req() req: { user: { id: string } }) {
    return this.qr.myQr(req.user.id);
  }

  @Post('scan')
  scan(
    @Req() req: { user: { id: string } },
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.qr.scanStamp(req.user.id, body, merchantHeader(headers));
  }

  @Post('sync-offline')
  syncOffline(
    @Req() req: { user: { id: string } },
    @Body() body: { scans: unknown[] },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.qr.syncOffline(req.user.id, body.scans || [], merchantHeader(headers));
  }
}
