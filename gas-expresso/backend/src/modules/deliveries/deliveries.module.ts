import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { DeliveryService } from './application/delivery.service';
import { DeliveriesController } from './presentation/deliveries.controller';

@Module({
  imports: [AuthModule],
  controllers: [DeliveriesController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveriesModule {}
