import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/application/auth.module';
import { OrdersController } from './presentation/orders.controller';
import { SupplierOrdersController } from './presentation/supplier-orders.controller';
import { OrderService } from './application/order.service';
import { DispatchModule } from '../dispatch/dispatch.module';
import { BillingModule } from '../billing/billing.module';

@Module({ imports: [AuthModule, DispatchModule, BillingModule], controllers: [OrdersController, SupplierOrdersController], providers: [OrderService], exports: [OrderService] })
export class OrdersModule {}
