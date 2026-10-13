import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { MapsModule } from '../maps/maps.module';
import { DispatchController } from './presentation/dispatch.controller';
import { DispatchService } from './application/dispatch.service';
import { DriverFinanceModule } from '../driver-finance/driver-finance.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, DriverFinanceModule, RealtimeModule, MapsModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
