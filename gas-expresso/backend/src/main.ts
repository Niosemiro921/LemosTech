import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const uploadDir = config.get<string>('mediaStoragePath')?.trim() || join(process.cwd(), 'uploads');
  app.use(
    '/uploads',
    express.static(uploadDir, {
      fallthrough: false,
      index: false,
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (filePath.toLowerCase().endsWith('.pdf')) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    }),
  );

  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAnyOrigin = configuredOrigins.length === 0 || configuredOrigins.includes('*');
  const isProduction = process.env.NODE_ENV === 'production';
  const privateNetworkOrigin =
    /^https?:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;

  if (allowAnyOrigin && isProduction) {
    console.warn('[security] CORS_ORIGIN não está restringido em produção. Defina os domínios permitidos.');
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed =
        !origin ||
        allowAnyOrigin ||
        configuredOrigins.includes(origin) ||
        (!isProduction && privateNetworkOrigin.test(origin));
      callback(null, allowed);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  await prisma.enableShutdownHooks(app);

  const port = config.get<number>('port') ?? 5048;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
