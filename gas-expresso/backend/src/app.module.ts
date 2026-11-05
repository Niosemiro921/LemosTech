import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './infrastructure/database/database.module';
import { SecurityModule } from './infrastructure/security/security.module';
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
import { ProfessionalsModule } from './modules/professionals.module';
import { MediaModule } from './modules/media/media.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ChatModule } from './modules/chat/chat.module';
import { MailModule } from './modules/mail/mail.module';
import { MapsModule } from './modules/maps/maps.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { BillingModule } from './modules/billing/billing.module';
import { ImportsModule } from './modules/imports/imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    SecurityModule,
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
    ProfessionalsModule,
    MediaModule,
    RealtimeModule,
    ChatModule,
    MailModule,
    MapsModule,
    AnalyticsModule,
    WalletsModule,
    BillingModule,
    ImportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}