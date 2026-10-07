import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequestWalletTopUpDto } from '../../operations/dto/operations.dto';
import { DriverFinanceService } from '../application/driver-finance.service';

@Controller('drivers/me/wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
export class DriverFinanceController {
  constructor(private readonly finance: DriverFinanceService) {}

  @Get()
  wallet(@Req() req: Request & { user: { sub: string } }) {
    return this.finance.getWallet(req.user.sub);
  }

  @Get('transactions')
  transactions(@Req() req: Request & { user: { sub: string } }) {
    return this.finance.listTransactions(req.user.sub);
  }

  @Get('earnings')
  earnings(@Req() req: Request & { user: { sub: string } }) {
    return this.finance.listEarnings(req.user.sub);
  }

  @Get('priority-policy')
  policy(@Req() req: Request & { user: { sub: string } }) {
    return this.finance.getPriorityPolicy(req.user.sub);
  }

  @Post('top-ups')
  requestTopUp(@Req() req: Request & { user: { sub: string } }, @Body() dto: RequestWalletTopUpDto) {
    return this.finance.requestTopUp(req.user.sub, dto.amount);
  }
}
