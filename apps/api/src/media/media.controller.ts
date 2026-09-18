import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { mediaLibraryForCategory, mediaLibraryGroupLabel } from '@stampperk/shared';
import { Public } from '../auth/public.decorator';
import { MediaService } from './media.service';

type Authed = {
  user: { id: string };
  protocol?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Public()
  @Get('library')
  library(@Query('categorySlug') categorySlug: string | undefined, @Req() req: Authed) {
    const base = this.media.publicBaseUrl(req);
    return mediaLibraryForCategory(categorySlug || null).map((item) => ({
      ...item,
      groupLabel: mediaLibraryGroupLabel(item.categoryGroup),
      url: `${base}${item.path}`,
    }));
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Authed,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Headers() headers: Record<string, string | undefined>,
    @Query('scope') scope?: string,
  ) {
    if (!file) throw new BadRequestException('file required');
    const merchantId = headers['x-merchant-id'] || headers['X-Merchant-Id'];
    return this.media.saveUpload(
      req.user.id,
      file,
      merchantId,
      this.media.publicBaseUrl(req),
      scope,
    );
  }
}
