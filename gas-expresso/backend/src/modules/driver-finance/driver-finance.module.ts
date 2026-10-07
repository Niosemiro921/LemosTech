import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { DriverFinanceService } from './application/driver-finance.service';
import { DriverFinanceController } from './presentation/driver-finance.controller';

@Module({
  imports: [AuthModule],
  controllers: [DriverFinanceController],
  providers: [DriverFinanceService],
  exports: [DriverFinanceService],
})
export class DriverFinanceModule {}
