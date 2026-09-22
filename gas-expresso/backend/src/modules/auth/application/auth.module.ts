import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '../../../infrastructure/security/security.module';

import { UsersModule } from '../../users/users.module';
import { CustomersModule } from '../../customers/customers.module';
import { DriversModule } from '../../drivers/drivers.module';
import { SuppliersModule } from '../../suppliers/suppliers.module';

import { AuthService } from './auth.service';
import { AuthController } from '../presentation/auth.controller';
import { RolesGuard } from '../guards/roles.guard';
import { ActiveAccountGuard } from '../guards/active-account.guard';

@Module({
  imports: [
    ConfigModule,
    SecurityModule,
    UsersModule,
    CustomersModule,
    DriversModule,
    SuppliersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard, ActiveAccountGuard],
  exports: [
    AuthService,
    RolesGuard,
    ActiveAccountGuard,
    SecurityModule,
  ],
})
export class AuthModule {}
