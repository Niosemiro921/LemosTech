import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/application/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { OperationsModule } from './modules/operations/operations.module';
import { DriverFinanceModule } from './modules/driver-finance/driver-finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    CustomersModule,
    DriversModule,
    SuppliersModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    DispatchModule,
    DeliveriesModule,
    OperationsModule,
    DriverFinanceModule,
  ],
})
export class AppModule {}
