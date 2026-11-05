import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';

@Controller('wallet')
export class WalletController {
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER, Role.SUPPLIER)
  getMyWallet(@Req() req: Request & { user: { sub: string } }) {
    return { currency: 'AOA', balance: 30000, reservedBalance: 0, availableBalance: 30000, minimumOperatingBalance: 10000, priorityScore: 78, priorityBand: 'PRO', updatedAt: new Date().toISOString() };
  }

  @Get('me/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER, Role.SUPPLIER)
  getMyTransactions(@Req() req: Request & { user: { sub: string } }) {
    return { transactions: [], total: 0 };
  }

  @Post('me/top-ups')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  topUpWallet(@Req() req: Request & { user: { sub: string } }, @Body() body: any) {
    return { topUpId: 'pending', amount: body.amount || 5000, status: 'PENDING_CONFIRMATION', userId: req.user.sub };
  }

  @Get('me/earnings')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
  @Roles(Role.DRIVER)
  getEarnings(@Req() req: Request & { user: { sub: string } }) {
    return { gross: 0, net: 0, platformFee: 0, status: 'ACCRUED', createdAt: new Date().toISOString() };
  }
}