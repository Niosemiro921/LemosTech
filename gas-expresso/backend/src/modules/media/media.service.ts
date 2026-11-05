import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface DetectedFile {
  extension: string;
  mimetype: string;
  kind: 'image' | 'document';
}

function detectFileType(buffer: Buffer): DetectedFile | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', mimetype: 'image/jpeg', kind: 'image' };
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: '.png', mimetype: 'image/png', kind: 'image' };
  }

  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: '.webp', mimetype: 'image/webp', kind: 'image' };
  }

  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { extension: '.pdf', mimetype: 'application/pdf', kind: 'document' };
  }

  return null;
}

@Injectable()
export class MediaService {
  private readonly uploadDir = process.env.MEDIA_STORAGE_PATH?.trim() || join(process.cwd(), 'uploads');
  private readonly publicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL?.trim() || '/uploads').replace(/\/$/, '');

  async storeImage(file: UploadedFile, prefix: string) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('A imagem não pode ultrapassar 5 MB.');

    const detected = detectFileType(file.buffer);
    if (!detected || detected.kind !== 'image') {
      throw new BadRequestException('Apenas imagens JPG, PNG ou WEBP válidas são aceites.');
    }

    return this.write(file, prefix, detected);
  }

  async storeDocument(file: UploadedFile, prefix: string) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('O comprovativo não pode ultrapassar 10 MB.');

    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new BadRequestException('Apenas comprovativos em JPG, PNG, WEBP ou PDF válidos são aceites.');
    }

    return this.write(file, prefix, detected);
  }

  private async write(file: UploadedFile, prefix: string, detected: DetectedFile) {
    await mkdir(this.uploadDir, { recursive: true });
    const filename = `${prefix}-${randomUUID()}${detected.extension}`;
    await writeFile(join(this.uploadDir, filename), file.buffer);
    return { url: `${this.publicBaseUrl}/${filename}`, filename };
  }
}
