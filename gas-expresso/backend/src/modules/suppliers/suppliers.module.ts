import { Module } from '@nestjs/common';
import { SupplierRepositoryPort } from './domain/supplier.repository';
import { SupplierService } from './application/supplier.service';

@Module({
  providers: [{ provide: SupplierRepositoryPort, useClass: SupplierService }],
  exports: [SupplierRepositoryPort],
})
export class SuppliersModule {}
