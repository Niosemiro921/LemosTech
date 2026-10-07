import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../../shared/domain/auth.enums';
import { UserRole } from '@prisma/client';
import { DispatchService } from '../application/dispatch.service';
import { StartDispatchDto } from '../dto/start-dispatch.dto';
import { DriverLocationDto } from '../dto/driver-location.dto';

@Controller()
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Get('drivers/me')
  status(@Req() req: Request & { user: { sub: string } }) {
    return this.dispatch.getDriverStatus(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @Post('dispatch/orders/:orderId/start')
  start(
    @Param('orderId') orderId: string,
    @Body() dto: StartDispatchDto,
    @Req() req: Request & { user: { sub: string; role: Role } },
  ) {
    return this.dispatch.startForOrder(orderId, dto.maxOffers ?? 3, req.user.sub, req.user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Get('drivers/me/offers')
  offers(@Req() req: Request & { user: { sub: string } }) {
    return this.dispatch.listDriverOffers(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Post('drivers/me/offers/:offerId/accept')
  accept(@Req() req: Request & { user: { sub: string } }, @Param('offerId') offerId: string) {
    return this.dispatch.acceptDriverOffer(req.user.sub, offerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Post('drivers/me/offers/:offerId/reject')
  reject(@Req() req: Request & { user: { sub: string } }, @Param('offerId') offerId: string) {
    return this.dispatch.rejectDriverOffer(req.user.sub, offerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Post('drivers/me/online')
  online(@Req() req: Request & { user: { sub: string } }, @Body() dto: DriverLocationDto) {
    return this.dispatch.startDriver(req.user.sub, dto.latitude, dto.longitude);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Post('drivers/me/offline')
  offline(@Req() req: Request & { user: { sub: string } }) {
    return this.dispatch.stopDriver(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  @Post('drivers/me/location')
  location(@Req() req: Request & { user: { sub: string } }, @Body() dto: DriverLocationDto) {
    return this.dispatch.updateDriverLocation(req.user.sub, dto.latitude, dto.longitude);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.CUSTOMER)
  @Get('orders/mine/:orderId/tracking')
  tracking(@Req() req: Request & { user: { sub: string } }, @Param('orderId') orderId: string) {
    return this.dispatch.getCustomerTracking(req.user.sub, orderId);
  }
}
