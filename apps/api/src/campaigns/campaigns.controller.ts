import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.campaigns.create(req.user.id, body);
  }

  @Get('discover')
  discover(@Req() req: { user: { id: string } }) {
    return this.campaigns.discoverForCustomer(req.user.id);
  }

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.campaigns.list(req.user.id);
  }

  @Patch(':id')
  update(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() body: unknown) {
    return this.campaigns.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.campaigns.remove(req.user.id, id);
  }

  @Post(':id/publish')
  publish(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.campaigns.publish(req.user.id, id);
  }
}
