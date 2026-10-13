import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { DriversModule } from './drivers/drivers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [SecurityModule, DriversModule, SuppliersModule],
  controllers: [ProfessionalsController],
  providers: [RolesGuard],
})
export class ProfessionalsModule {}



