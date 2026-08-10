import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminService } from '../admin/admin.service';

@Controller('branding')
export class BrandingController {
  constructor(private admin: AdminService) {}

  @Public()
  @Get()
  getPublic() {
    return this.admin.getBranding();
  }
}

@Controller('admin/settings')
export class AdminBrandingController {
  constructor(private admin: AdminService) {}

  @Patch('branding')
  update(
    @Req() req: { user: { role: string; id?: string; userId?: string } },
    @Body() body: unknown,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.admin.updateBranding(req.user.role, body, userId);
  }
}
