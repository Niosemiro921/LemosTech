import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { InventoryController } from './presentation/inventory.controller';
import { InventoryService } from './application/inventory.service';

@Module({ imports: [AuthModule], controllers: [InventoryController], providers: [InventoryService], exports: [InventoryService] })
export class InventoryModule {}
