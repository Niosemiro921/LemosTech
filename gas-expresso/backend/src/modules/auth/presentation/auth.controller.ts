import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterCustomerDto } from '../application/dto/register-customer.dto';
import { RegisterDriverDto } from '../application/dto/register-driver.dto';
import { RegisterSupplierDto } from '../application/dto/register-supplier.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
}
