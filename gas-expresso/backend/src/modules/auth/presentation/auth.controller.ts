import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterCustomerDto } from '../application/dto/register-customer.dto';
import { RegisterDriverDto } from '../application/dto/register-driver.dto';
import { RegisterSupplierDto } from '../application/dto/register-supplier.dto';
import { RegisterPrestadorDto } from '../application/dto/register-prestador.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ActiveAccountGuard } from '../guards/active-account.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';
import { UpdateCustomerProfileDto } from '../application/dto/update-customer-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register/customer')
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.auth.registerCustomer(dto);
  }

  @Post('register/driver')
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.auth.registerDriver(dto);
  }

  @Post('register/supplier')
  registerSupplier(@Body() dto: RegisterSupplierDto) {
    return this.auth.registerSupplier(dto);
  }

  @Post('register/prestador')
  registerPrestador(@Body() dto: RegisterPrestadorDto) {
    return this.auth.registerPrestador(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request & { user: { sub: string; jti?: string; exp?: number } }) {
    return this.auth.logout(req.user.sub, req.user.jti, req.user.exp);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.CUSTOMER)
  @Patch('me')
  updateMe(@Req() req: Request & { user: { sub: string } }, @Body() dto: UpdateCustomerProfileDto) {
    return this.auth.updateCustomerProfile(req.user.sub, dto);
  }
}
