import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './common/zod-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const isDev = process.env.NODE_ENV !== 'production';
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isDev
      ? (origin, cb) => {
          if (!origin || origins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            cb(null, true);
            return;
          }
          cb(null, origins.includes(origin));
        }
      : origins,
    credentials: true,
  });

  const uploadsDir = join(process.cwd(), 'uploads');
  const libraryDir = join(process.cwd(), 'public', 'library');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  if (!existsSync(libraryDir)) mkdirSync(libraryDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });
  app.useStaticAssets(libraryDir, { prefix: '/library' });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ZodExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Stamp Perk API')
    .setDescription('Digital loyalty & rewards platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Stamp Perk API listening on http://localhost:${port}`);
}

bootstrap();
