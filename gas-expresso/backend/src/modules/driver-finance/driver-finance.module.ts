import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { DriverFinanceService } from './application/driver-finance.service';
import { DriverFinanceController } from './presentation/driver-finance.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [DriverFinanceController],
  providers: [DriverFinanceService],
  exports: [DriverFinanceService],
})
export class DriverFinanceModule {}
