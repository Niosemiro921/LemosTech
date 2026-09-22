import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../../shared/domain/auth.enums';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: Request & { user: unknown }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @Get('driver-area-smoke-test')
  driverArea() {
    return { ok: true, role: Role.DRIVER, message: 'Área protegida do entregador.' };
  }
}
