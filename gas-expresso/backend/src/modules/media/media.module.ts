import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({ imports: [DriversModule, SuppliersModule], controllers: [MediaController], providers: [MediaService], exports: [MediaService] })
export class MediaModule {}
