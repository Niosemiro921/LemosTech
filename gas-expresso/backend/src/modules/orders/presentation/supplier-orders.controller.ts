import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrderStatus } from '@prisma/client';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../../shared/domain/auth.enums';
import { OrderService } from '../application/order.service';
import { NoteDto } from '../dto/note.dto';

@Controller('suppliers/me/orders')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.SUPPLIER)
export class SupplierOrdersController {
  constructor(private readonly orders: OrderService) {}
  @Get() list(@Req() req: Request & { user: { sub: string } }, @Query('status') status?: OrderStatus) { return this.orders.listSupplierOrders(req.user.sub, status); }
  @Post(':id/accept') accept(@Req() req: Request & { user: { sub: string } }, @Param('id') id: string) { return this.orders.supplierAccept(req.user.sub, id); }
  @Post(':id/prepare') prepare(@Req() req: Request & { user: { sub: string } }, @Param('id') id: string) { return this.orders.supplierPreparing(req.user.sub, id); }
  @Post(':id/ready') ready(@Req() req: Request & { user: { sub: string } }, @Param('id') id: string) { return this.orders.supplierReady(req.user.sub, id); }
  @Post(':id/cancel') cancel(@Req() req: Request & { user: { sub: string } }, @Param('id') id: string, @Body() dto: NoteDto) { return this.orders.supplierCancel(req.user.sub, id, dto.note); }
}
