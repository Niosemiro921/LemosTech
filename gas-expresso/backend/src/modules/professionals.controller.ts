import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../shared/domain/auth.enums';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/guards/roles.decorator';
import { DriverRepositoryPort } from './drivers/domain/driver.repository';
import { SupplierRepositoryPort } from './suppliers/domain/supplier.repository';
import { UpdateDriverProfileDto } from './drivers/dto/update-driver-profile.dto';
import { UpdateSupplierProfileDto } from './suppliers/dto/update-supplier-profile.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalsController {
  constructor(private readonly drivers: DriverRepositoryPort, private readonly suppliers: SupplierRepositoryPort) {}

  @Get('drivers/me/profile')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  driverProfile(@Req() req: Request & { user: { sub: string } }) { return this.drivers.getByUserId(req.user.sub); }

  @Patch('drivers/me/profile')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  driverProfileUpdate(@Req() req: Request & { user: { sub: string } }, @Body() dto: UpdateDriverProfileDto) {
    return this.drivers.updateByUserId(req.user.sub, {
      ...dto,
      insuranceExpiresAt: dto.insuranceExpiresAt === undefined ? undefined : dto.insuranceExpiresAt ? new Date(dto.insuranceExpiresAt) : null,
    });
  }

  @Get('suppliers/me/profile')
  @Roles(Role.SUPPLIER)
  supplierProfile(@Req() req: Request & { user: { sub: string } }) { return this.suppliers.getByUserId(req.user.sub); }

  @Patch('suppliers/me/profile')
  @Roles(Role.SUPPLIER)
  supplierProfileUpdate(@Req() req: Request & { user: { sub: string } }, @Body() dto: UpdateSupplierProfileDto) {
    return this.suppliers.updateByUserId(req.user.sub, dto);
  }
}
