import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class MediaService {
  uploadsRoot() {
    return join(process.cwd(), 'uploads');
  }

  publicRoot() {
    return join(process.cwd(), 'public');
  }

  publicBaseUrl(req: {
    protocol?: string;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const env = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL;
    if (env) return env.replace(/\/$/, '');
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:4000') as string;
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto =
      (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) ||
      req.protocol ||
      'http';
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  saveUpload(
    userId: string,
    file: Express.Multer.File,
    merchantId: string | undefined,
    baseUrl: string,
    scope?: string,
  ) {
    const ext = extname(file.originalname || '').toLowerCase() || this.extFromMime(file.mimetype);
    if (!ALLOWED.has(ext) || !MIME.has(file.mimetype)) {
      throw new BadRequestException('Only jpeg, png, webp, or gif images up to 2MB are allowed');
    }
    if (!file.buffer?.length && !file.size) {
      throw new BadRequestException('Empty file');
    }

    const folder =
      scope === 'platform'
        ? join('platform')
        : merchantId
          ? join('merchants', merchantId)
          : join('users', userId);
    const absDir = join(this.uploadsRoot(), folder);
    mkdirSync(absDir, { recursive: true });

    const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const absPath = join(absDir, name);
    if (!Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Upload buffer missing — use memory storage');
    }
    writeFileSync(absPath, file.buffer);

    const urlPath = `/uploads/${folder.replace(/\\/g, '/')}/${name}`;
    return {
      url: `${baseUrl}${urlPath}`,
      path: urlPath,
      size: file.size,
      mime: file.mimetype,
    };
  }

  private extFromMime(mime: string) {
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    return '';
  }

  ensureDirs() {
    mkdirSync(this.uploadsRoot(), { recursive: true });
    const lib = join(this.publicRoot(), 'library');
    if (!existsSync(lib)) mkdirSync(lib, { recursive: true });
  }
}
