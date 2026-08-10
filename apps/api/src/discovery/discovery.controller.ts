import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { Public } from '../auth/public.decorator';

@Controller('discovery')
export class DiscoveryController {
  constructor(private discovery: DiscoveryService) {}

  @Public()
  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('groupId') groupId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('locale') locale?: string,
    @Query('verified') verified?: string,
  ) {
    return this.discovery.search({
      q,
      category,
      groupId,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      locale,
      verifiedOnly: verified === '1' || verified === 'true',
    });
  }

  @Public()
  @Get('categories')
  categories(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('locale') locale?: string,
  ) {
    return this.discovery.categories({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      locale,
    });
  }
}
