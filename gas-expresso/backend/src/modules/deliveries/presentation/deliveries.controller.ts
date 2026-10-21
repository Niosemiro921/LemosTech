import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DeliveryStatus } from '@prisma/client';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';
import { DeliveryService } from '../application/delivery.service';
import { DriverActionDto } from '../dto/driver-action.dto';

@Controller('drivers/me/deliveries')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.DRIVER)
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveryService) {}

  @Get('current')
  current(@Req() req: Request & { user: { sub: string } }) {
    return this.deliveries.getCurrentForDriver(req.user.sub);
  }

  @Get(':deliveryId')
  get(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string) {
    return this.deliveries.getByIdForDriver(req.user.sub, deliveryId);
  }

  @Post(':deliveryId/to-pickup')
  toPickup(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.TO_PICKUP, dto.note, dto.latitude, dto.longitude);
  }

  @Post(':deliveryId/at-pickup')
  atPickup(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.AT_PICKUP, dto.note, dto.latitude, dto.longitude);
  }

  @Post(':deliveryId/picked-up')
  pickedUp(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.PICKED_UP, dto.note, dto.latitude, dto.longitude);
  }

  @Post(':deliveryId/in-transit')
  inTransit(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.IN_TRANSIT, dto.note, dto.latitude, dto.longitude);
  }

  @Post(':deliveryId/arrived')
  arrived(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.ARRIVED, dto.note, dto.latitude, dto.longitude);
  }

  @Post(':deliveryId/delivered')
  delivered(@Req() req: Request & { user: { sub: string } }, @Param('deliveryId') deliveryId: string, @Body() dto: DriverActionDto) {
    return this.deliveries.transitionForDriver(req.user.sub, deliveryId, DeliveryStatus.DELIVERED, dto.note, dto.latitude, dto.longitude);
  }
}
