import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, DeliveryStatus, UserRole, WalletTopUpStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class DriverFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const availableBalance = wallet.balance - wallet.reservedBalance;
    return {
      currency: 'AOA',
      balance: wallet.balance,
      reservedBalance: wallet.reservedBalance,
      availableBalance,
      minimumOperatingBalance: wallet.minimumOperatingBalance,
      priorityScore: 0,
      priorityBand: availableBalance >= wallet.minimumOperatingBalance ? 'STANDARD' : 'INELIGIBLE',
      updatedAt: wallet.updatedAt,
    };
  }

  async listTransactions(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listEarnings(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true, status: true } } },
    });
    if (!driver) throw new NotFoundException('Perfil de entregador não encontrado.');
    if (driver.user.role !== UserRole.DRIVER || driver.user.status !== AccountStatus.ACTIVE) {
      throw new ConflictException('O entregador ainda não está autorizado a operar.');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        driverId: driver.id,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: { not: null },
      },
      select: {
        id: true,
        deliveredAt: true,
        order: { select: { reference: true, deliveryFee: true } },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 100,
    });

    return deliveries.map((delivery) => {
      const gross = delivery.order.deliveryFee;
      const net = Math.round(gross * 0.9);
      return {
        id: delivery.id,
        reference: delivery.order.reference,
        gross,
        platformFee: gross - net,
        net,
        status: 'ACCRUED' as const,
        createdAt: delivery.deliveredAt!,
      };
    });
  }

  async getPriorityPolicy(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      bands: [{
        code: 'STANDARD',
        label: 'Operacional',
        minBalance: wallet.minimumOperatingBalance,
        description: 'Saldo mínimo confirmado para elegibilidade operacional.',
      }],
      factors: [],
      continuityEnabled: false,
    };
  }

  async requestTopUp(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    const topUp = await this.prisma.walletTopUp.create({
      data: {
        walletId: wallet.id,
        amount,
        reference: `TOP-${randomUUID().slice(0, 10).toUpperCase()}`,
      },
    });
    return {
      id: topUp.id,
      amount: topUp.amount,
      status: topUp.status,
      reference: topUp.reference,
      createdAt: topUp.createdAt,
    };
  }

  async listPendingTopUps() {
    const topUps = await this.prisma.walletTopUp.findMany({
      include: {
        wallet: {
          include: {
            driver: { select: { id: true, fullName: true, userId: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return topUps.map((topUp) => ({
      id: topUp.id,
      driverId: topUp.wallet.driver.id,
      driverName: topUp.wallet.driver.fullName,
      amount: topUp.amount,
      status: topUp.status,
      reference: topUp.reference,
      createdAt: topUp.createdAt,
    }));
  }

  async decideTopUp(adminUserId: string, topUpId: string, approve: boolean, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const topUp = await tx.walletTopUp.findUnique({
        where: { id: topUpId },
        include: { wallet: { include: { driver: true } } },
      });
      if (!topUp) throw new NotFoundException('Solicitação de recarga não encontrada.');
      if (topUp.status !== WalletTopUpStatus.PENDING) {
        throw new ConflictException('Esta solicitação já foi decidida.');
      }
      if (!approve && !reason?.trim()) {
        throw new BadRequestException('Informe o motivo para rejeitar a solicitação.');
      }

      const now = new Date();
      const changed = await tx.walletTopUp.updateMany({
        where: { id: topUpId, status: WalletTopUpStatus.PENDING },
        data: {
          status: approve ? WalletTopUpStatus.APPROVED : WalletTopUpStatus.REJECTED,
          reviewedById: adminUserId,
          reviewNote: reason?.trim() || null,
          reviewedAt: now,
        },
      });
      if (changed.count !== 1) throw new ConflictException('A solicitação mudou de estado. Atualize e tente novamente.');

      if (approve) {
        const wallet = await tx.driverWallet.update({
          where: { id: topUp.walletId },
          data: { balance: { increment: topUp.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'TOP_UP',
            amount: topUp.amount,
            balanceAfter: wallet.balance,
            description: 'Recarga confirmada pela administração.',
            reference: topUp.reference,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          targetUserId: topUp.wallet.driver.userId,
          action: approve ? 'WALLET_TOP_UP_APPROVED' : 'WALLET_TOP_UP_REJECTED',
          reason: reason?.trim() || null,
          entity: 'WALLET_TOP_UP',
          entityId: topUp.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: topUp.wallet.driver.userId,
          title: approve ? 'Recarga confirmada' : 'Recarga rejeitada',
          message: approve
            ? `A recarga ${topUp.reference} foi confirmada.`
            : `A recarga ${topUp.reference} foi rejeitada${reason?.trim() ? `: ${reason.trim()}` : '.'}`,
          type: 'WALLET',
        },
      });

      return {
        id: topUp.id,
        amount: topUp.amount,
        status: approve ? WalletTopUpStatus.APPROVED : WalletTopUpStatus.REJECTED,
        reference: topUp.reference,
      };
    });
  }

  async assertOperatingBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const available = wallet.balance - wallet.reservedBalance;
    if (available < wallet.minimumOperatingBalance) {
      throw new ConflictException('O saldo confirmado está abaixo do mínimo operacional.');
    }
    return wallet;
  }

  private async getOrCreateWallet(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true, status: true } } },
    });
    if (!driver) throw new NotFoundException('Perfil de entregador não encontrado.');
    if (driver.user.role !== UserRole.DRIVER || driver.user.status !== AccountStatus.ACTIVE) {
      throw new ConflictException('O entregador ainda não está autorizado a operar.');
    }
    const configuredMinimum = Number(process.env.MINIMUM_DRIVER_OPERATING_BALANCE ?? '10000');
    const minimumOperatingBalance = Number.isSafeInteger(configuredMinimum) && configuredMinimum >= 0
      ? configuredMinimum
      : 10000;
    return this.prisma.driverWallet.upsert({
      where: { driverId: driver.id },
      create: { driverId: driver.id, minimumOperatingBalance },
      update: {},
    });
  }
}
