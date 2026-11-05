import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionInvoiceStatus } from '@prisma/client';
import { Role } from '../../../shared/domain/auth.enums';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BillingService } from '../application/billing.service';
import {
  CreateBillingPlanDto,
  RejectSubscriptionInvoiceDto,
  ReviewSubscriptionInvoiceDto,
  UpdateBillingPlanDto,
  UpdateSubscriptionStatusDto,
} from '../dto/billing.dto';

type ReqUser = Request & { user: { sub: string } };

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.ADMIN)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  plans() {
    return this.billing.listPlans();
  }

  @Post('plans')
  createPlan(@Body() dto: CreateBillingPlanDto) {
    return this.billing.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBillingPlanDto) {
    return this.billing.updatePlan(id, dto);
  }

  @Get('invoices')
  invoices(@Query('status') status?: SubscriptionInvoiceStatus) {
    return this.billing.listInvoicesForAdmin(status);
  }

  @Post('invoices/:id/confirm')
  confirm(@Req() req: ReqUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() _dto?: ReviewSubscriptionInvoiceDto) {
    return this.billing.confirmInvoice(req.user.sub, id);
  }

  @Post('invoices/:id/reject')
  reject(@Req() req: ReqUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: RejectSubscriptionInvoiceDto) {
    return this.billing.rejectInvoice(req.user.sub, id, dto.reason);
  }

  @Get('subscriptions')
  subscriptions() {
    return this.billing.listSubscriptions();
  }

  @Post('subscriptions/:supplierId/:action')
  updateSubscription(
    @Req() req: ReqUser,
    @Param('supplierId', new ParseUUIDPipe()) supplierId: string,
    @Param('action') action: string,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.billing.updateSubscriptionStatus(req.user.sub, supplierId, action, dto?.reason);
  }
}
