import { Module } from '@nestjs/common';
import { CustomerRepositoryPort } from './domain/customer.repository';
import { CustomerService } from './application/customer.service';

@Module({
  providers: [{ provide: CustomerRepositoryPort, useClass: CustomerService }],
  exports: [CustomerRepositoryPort],
})
export class CustomersModule {}
