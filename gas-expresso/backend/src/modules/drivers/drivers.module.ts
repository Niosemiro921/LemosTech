import { Module } from '@nestjs/common';
import { DriverRepositoryPort } from './domain/driver.repository';
import { DriverService } from './application/driver.service';

@Module({
  providers: [{ provide: DriverRepositoryPort, useClass: DriverService }],
  exports: [DriverRepositoryPort],
})
export class DriversModule {}
