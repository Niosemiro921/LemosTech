import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../../shared/domain/auth.enums';
import { OrderService } from '../application/order.service';
import { QuoteOrderDto } from '../dto/quote-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrderService) {}
  @Post('quote') quote(@Body() dto: QuoteOrderDto) { return this.orders.quote(dto); }
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard) @Roles(Role.CUSTOMER)
  @Post() create(@Req() req: Request & { user: { sub: string } }, @Body() dto: CreateOrderDto, @Headers('Idempotency-Key') idempotencyKey?: string) { return this.orders.create(req.user.sub, dto, idempotencyKey); }
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard) @Roles(Role.CUSTOMER)
  @Get('mine') listMine(@Req() req: Request & { user: { sub: string } }) { return this.orders.listCustomerOrders(req.user.sub); }
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard) @Roles(Role.CUSTOMER)
  @Get('mine/:id') getMine(@Req() req: Request & { user: { sub: string } }, @Param('id') id: string) { return this.orders.getCustomerOrder(req.user.sub, id); }
}
