import { Module, OnModuleInit } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule implements OnModuleInit {
  constructor(private media: MediaService) {}

  onModuleInit() {
    this.media.ensureDirs();
  }
}
