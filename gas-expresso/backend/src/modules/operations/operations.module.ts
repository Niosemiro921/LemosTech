import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { OperationsService } from './application/operations.service';
import { InventoryAvailabilityController, OperationsController } from './presentation/operations.controller';

@Module({
  imports: [AuthModule],
  controllers: [OperationsController, InventoryAvailabilityController],
  providers: [OperationsService],
})
export class OperationsModule {}
