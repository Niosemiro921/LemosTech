import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminService } from '../application/admin.service';
import { ReviewDecisionDto } from '../application/dto/review-decision.dto';
import { WalletTopUpDecisionDto } from '../../operations/dto/operations.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.getOverview();
  }

  @Get('partners')
  partners(@Query('type') type?: string) {
    return this.admin.listPartners(type);
  }

  @Post('partners/:id/:action')
  updatePartner(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('action') action: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    if (!['approve', 'reject', 'suspend', 'reactivate'].includes(action)) {
      throw new BadRequestException('Ação de parceiro inválida.');
    }
    return this.admin.updatePartnerStatus(
      req.user.sub,
      id,
      action as 'approve' | 'reject' | 'suspend' | 'reactivate',
      dto?.reason,
    );
  }

  @Get('orders')
  orders() {
    return this.admin.listOrders();
  }

  @Get('dispatch/queue')
  dispatchQueue() {
    return this.admin.getDispatchQueue();
  }

  @Post('dispatch/orders/:orderId/retry')
  retryDispatch(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.retryDispatch(req.user.sub, orderId);
  }

  @Get('audit')
  auditLog() {
    return this.admin.listAuditLog();
  }

  @Get('wallet/top-ups')
  walletTopUps() {
    return this.admin.listWalletTopUps();
  }

  @Post('wallet/top-ups/:id/confirm')
  confirmWalletTopUp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto?: WalletTopUpDecisionDto,
  ) {
    return this.admin.decideWalletTopUp(req.user.sub, id, true, dto?.reason);
  }

  @Post('wallet/top-ups/:id/reject')
  rejectWalletTopUp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: WalletTopUpDecisionDto,
  ) {
    return this.admin.decideWalletTopUp(req.user.sub, id, false, dto.reason);
  }

  @Get('applications')
  list(
    @Query('role') role?: Role,
    @Query('status') status?: AccountStatus,
  ) {
    return this.admin.listApplications(role, status);
  }

  @Get('applications/:userId')
  get(@Param('userId') userId: string) {
    return this.admin.getApplication(userId);
  }

  @Post('applications/:userId/approve')
  approve(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.approve(req.user.sub, userId, dto.reason);
  }

  @Post('applications/:userId/reject')
  reject(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.reject(req.user.sub, userId, dto.reason);
  }

  @Post('applications/:userId/request-documents')
  requestDocuments(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.requestDocuments(req.user.sub, userId, dto.reason);
  }
}
