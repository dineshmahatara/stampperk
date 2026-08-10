import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
    return {
      status: 'ok',
      service: 'stampz-api',
      database: 'ok',
      time: new Date().toISOString(),
    };
  }
}
