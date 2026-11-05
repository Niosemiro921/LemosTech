import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BillingService } from '../application/billing.service';
import { CreateSubscriptionInvoiceDto, SubmitInvoiceProofDto } from '../dto/billing.dto';

type ReqUser = Request & { user: { sub: string } };

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPPLIER)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('overview')
  overview(@Req() req: ReqUser) {
    return this.billing.getOverview(req.user.sub);
  }

  @Get('invoices')
  invoices(@Req() req: ReqUser) {
    return this.billing.listInvoices(req.user.sub);
  }

  @Post('invoices')
  createInvoice(@Req() req: ReqUser, @Body() dto: CreateSubscriptionInvoiceDto) {
    return this.billing.createInvoice(req.user.sub, dto);
  }

  @Post('invoices/:id/proof')
  submitProof(@Req() req: ReqUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: SubmitInvoiceProofDto) {
    return this.billing.submitProof(req.user.sub, id, dto);
  }
}
