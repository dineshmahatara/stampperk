import { Module } from '@nestjs/common';
import { LeafletsController } from './leaflets.controller';
import { LeafletsService } from './leaflets.service';

@Module({
  controllers: [LeafletsController],
  providers: [LeafletsService],
  exports: [LeafletsService],
})
export class LeafletsModule {}
