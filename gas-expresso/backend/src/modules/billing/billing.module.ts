import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from '../auth/application/auth.module';
import { BillingService } from './application/billing.service';
import { BillingController } from './presentation/billing.controller';
import { AdminBillingController } from './presentation/admin-billing.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [BillingController, AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
