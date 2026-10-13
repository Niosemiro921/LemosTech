import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { SupplierRepositoryPort } from './domain/supplier.repository';
import { SupplierService } from './application/supplier.service';
import { SupplierBusinessService } from './application/supplier-business.service';
import { SupplierBusinessController } from './presentation/supplier-business.controller';

@Module({ imports: [DatabaseModule], controllers: [SupplierBusinessController], providers: [{ provide: SupplierRepositoryPort, useClass: SupplierService }, SupplierBusinessService], exports: [SupplierRepositoryPort, SupplierBusinessService] })
export class SuppliersModule {}
