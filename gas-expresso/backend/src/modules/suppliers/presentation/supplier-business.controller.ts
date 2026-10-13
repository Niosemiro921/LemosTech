import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { SupplierBusinessService } from '../application/supplier-business.service';
import { CreateInteractionDto, CreateInvoiceDto, CreateLotDto, UpdateLotDto } from '../dto/supplier-business.dto';

type ReqUser = Request & { user: { sub: string } };
@Controller('suppliers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPPLIER)
export class SupplierBusinessController {
  constructor(private readonly service: SupplierBusinessService) {}
  @Get('dashboard') dashboard(@Req() req: ReqUser) { return this.service.getDashboard(req.user.sub); }
  @Get('lots') lots(@Req() req: ReqUser) { return this.service.listLots(req.user.sub); }
  @Post('lots') createLot(@Req() req: ReqUser, @Body() dto: CreateLotDto) { return this.service.createLot(req.user.sub, dto); }
  @Patch('lots/:id') updateLot(@Req() req: ReqUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateLotDto) { return this.service.updateLot(req.user.sub, id, dto); }
  @Get('invoices') invoices(@Req() req: ReqUser) { return this.service.listInvoices(req.user.sub); }
  @Post('invoices') createInvoice(@Req() req: ReqUser, @Body() dto: CreateInvoiceDto) { return this.service.createInvoice(req.user.sub, dto); }
  @Get('customers') customers(@Req() req: ReqUser) { return this.service.listCustomers(req.user.sub); }
  @Get('interactions') interactions(@Req() req: ReqUser, @Query('customerId') customerId?: string) { return this.service.listInteractions(req.user.sub, customerId); }
  @Post('interactions') interaction(@Req() req: ReqUser, @Body() dto: CreateInteractionDto) { return this.service.createInteraction(req.user.sub, dto); }
  @Get('segmentation') segmentation(@Req() req: ReqUser) { return this.service.segmentation(req.user.sub); }
  @Get('reports') reports(@Req() req: ReqUser) { return this.service.reports(req.user.sub); }
}
