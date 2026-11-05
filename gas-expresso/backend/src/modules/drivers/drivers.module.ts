import { Module } from '@nestjs/common';
import { DriversPresentationModule } from './presentation/drivers.presentation.module';

@Module({
  imports: [DriversPresentationModule],
  exports: [DriversPresentationModule],
})
export class DriversModule {}
