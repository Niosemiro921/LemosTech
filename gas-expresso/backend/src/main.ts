import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import * as express from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const uploadDir = config.get<string>('mediaStoragePath')?.trim() || join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir, { fallthrough: false, index: false }));

  app.enableCors({ origin: config.get<string>('corsOrigin'), credentials: true });
  await prisma.enableShutdownHooks(app);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

void bootstrap();
