import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MediaService {
  private readonly uploadDir = process.env.MEDIA_STORAGE_PATH?.trim() || join(process.cwd(), 'uploads');
  private readonly publicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL?.trim() || '/uploads').replace(/\/$/, '');

  async storeImage(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }, prefix: string) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Apenas imagens JPG, PNG ou WEBP são aceites.');
    }
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('A imagem não pode ultrapassar 5 MB.');
    await mkdir(this.uploadDir, { recursive: true });
    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${prefix}-${randomUUID()}${extension}`;
    await writeFile(join(this.uploadDir, filename), file.buffer);
    return { url: `${this.publicBaseUrl}/${filename}`, filename };
  }
}
