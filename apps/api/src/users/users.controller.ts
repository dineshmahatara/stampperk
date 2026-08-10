import { Body, Controller, Patch, Req } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Patch('me')
  updateMe(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.users.updateProfile(req.user.id, body);
  }

  @Patch('me/location')
  updateLocation(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.users.updateLocation(req.user.id, body);
  }
}
