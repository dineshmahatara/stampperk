import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { LeafletsService } from './leaflets.service';

function mid(headers: Record<string, string | undefined>) {
  return headers['x-merchant-id'] || headers['X-Merchant-Id'] || undefined;
}

@Controller('leaflets')
export class LeafletsController {
  constructor(private leaflets: LeafletsService) {}

  @Get('templates')
  listTemplates() {
    return this.leaflets.listActiveTemplates();
  }

  @Get()
  listMine(@Req() req: { user: { id: string } }, @Headers() headers: Record<string, string | undefined>) {
    return this.leaflets.listMine(req.user.id, mid(headers));
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.leaflets.create(req.user.id, body, mid(headers));
  }

  @Patch(':id')
  update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    return this.leaflets.update(req.user.id, id, body, mid(headers));
  }

  @Delete(':id')
  remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.leaflets.remove(req.user.id, id, mid(headers));
  }

  @Post(':id/publish')
  publish(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { published?: boolean },
  ) {
    return this.leaflets.publish(req.user.id, id, body?.published !== false, mid(headers));
  }

  @Post(':id/unpublish')
  unpublish(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.leaflets.publish(req.user.id, id, false, mid(headers));
  }

  @Public()
  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.leaflets.getPublic(token);
  }
}
