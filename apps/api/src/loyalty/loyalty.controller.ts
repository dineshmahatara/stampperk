import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { Public } from '../auth/public.decorator';

function mid(headers: Record<string, string | undefined>) {
  return headers['x-merchant-id'] || headers['X-Merchant-Id'] || undefined;
}

@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Public()
  @Get('catalog')
  catalog() {
    return this.loyalty.catalog();
  }

  @Post('programs')
  createProgram(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.loyalty.createProgram(req.user.id, body, mid(headers));
  }

  @Get('programs')
  listPrograms(@Req() req: { user: { id: string } }, @Headers() headers: Record<string, string | undefined>) {
    return this.loyalty.listPrograms(req.user.id, mid(headers));
  }

  @Patch('programs/:id')
  updateProgram(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.loyalty.updateProgram(req.user.id, id, body, mid(headers));
  }

  @Delete('programs/:id')
  deleteProgram(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    return this.loyalty.deleteProgram(req.user.id, id, mid(headers));
  }

  @Post('programs/:id/enroll')
  enroll(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.loyalty.enroll(req.user.id, id);
  }

  @Get('cards/me')
  myCards(@Req() req: { user: { id: string } }) {
    return this.loyalty.myCards(req.user.id);
  }

  @Post('redeem')
  redeem(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.loyalty.redeem(req.user.id, body);
  }

  @Get('transfers')
  listTransfers(@Req() req: { user: { id: string } }) {
    return this.loyalty.listStampTransfers(req.user.id);
  }

  @Post('transfers')
  createTransfer(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.loyalty.createStampTransfer(req.user.id, body);
  }

  @Post('transfers/:id/accept')
  acceptTransfer(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.loyalty.acceptStampTransfer(req.user.id, id);
  }

  @Post('transfers/:id/decline')
  declineTransfer(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.loyalty.declineStampTransfer(req.user.id, id);
  }

  @Post('transfers/:id/cancel')
  cancelTransfer(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.loyalty.cancelStampTransfer(req.user.id, id);
  }
}
