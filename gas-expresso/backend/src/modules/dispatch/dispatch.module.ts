import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { DispatchController } from './presentation/dispatch.controller';
import { DispatchService } from './application/dispatch.service';
import { DriverFinanceModule } from '../driver-finance/driver-finance.module';

@Module({
  imports: [AuthModule, DriverFinanceModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
