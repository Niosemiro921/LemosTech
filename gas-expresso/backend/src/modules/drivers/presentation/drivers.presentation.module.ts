import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriverService } from '../application/driver.service';
import { DriverRepositoryPort } from '../domain/driver.repository';

@Module({
  controllers: [DriversController],
  providers: [
    DriverService,
    {
      provide: DriverRepositoryPort,
      useClass: DriverService,
    },
  ],
  exports: [DriverRepositoryPort],
})
export class DriversPresentationModule {}