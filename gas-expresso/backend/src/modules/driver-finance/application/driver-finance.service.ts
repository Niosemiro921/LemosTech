import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, DeliveryStatus, Prisma, UserRole, WalletTopUpStatus, WalletWithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

type WithdrawalAction = 'APPROVE' | 'REJECT' | 'PAY';

@Injectable()
export class DriverFinanceService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const availableBalance = wallet.balance - wallet.reservedBalance;
    const policy = this.buildPriorityPolicy(wallet.minimumOperatingBalance);
    const priority = this.calculatePriority(availableBalance, 0, 1, 5, false);
    return {
      currency: 'AOA',
      balance: wallet.balance,
      reservedBalance: wallet.reservedBalance,
      availableBalance,
      minimumOperatingBalance: wallet.minimumOperatingBalance,
      priorityScore: priority.score,
      priorityBand: this.bandForBalance(availableBalance, policy.bands).code,
      updatedAt: wallet.updatedAt,
    };
  }

  async listTransactions(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async listEarnings(userId: string) {
    const driver = await this.getProfessional(userId);
    const deliveries = await this.prisma.delivery.findMany({
      where: { driverId: driver.id, status: DeliveryStatus.DELIVERED, deliveredAt: { not: null } },
      select: { id: true, deliveredAt: true, order: { select: { reference: true, deliveryFee: true } } },
      orderBy: { deliveredAt: 'desc' },
      take: 200,
    });
    const commissionRate = this.platformCommissionRate();
    return deliveries.map((delivery) => {
      const gross = delivery.order.deliveryFee;
      const platformFee = Math.round(gross * commissionRate);
      return { id: delivery.id, reference: delivery.order.reference, gross, platformFee, net: gross - platformFee, status: 'ACCRUED' as const, createdAt: delivery.deliveredAt! };
    });
  }

  async getPriorityPolicy(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { ...this.buildPriorityPolicy(wallet.minimumOperatingBalance), continuityEnabled: true };
  }

  async requestTopUp(userId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 1000000) throw new BadRequestException('A recarga deve estar entre 1.000 Kz e 1.000.000 Kz.');
    const wallet = await this.getOrCreateWallet(userId);
    const existing = await this.prisma.walletTopUp.findFirst({ where: { walletId: wallet.id, status: WalletTopUpStatus.PENDING }, select: { id: true } });
    if (existing) throw new ConflictException('Já existe uma solicitação de recarga pendente.');
    const topUp = await this.prisma.walletTopUp.create({ data: { walletId: wallet.id, amount, reference: `TOP-${randomUUID().slice(0, 10).toUpperCase()}` } });
    return { id: topUp.id, amount: topUp.amount, status: topUp.status, reference: topUp.reference, currency: 'AOA', createdAt: topUp.createdAt };
  }

  async requestWithdrawal(userId: string, amount: number, method: string, account: string) {
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 1000000) throw new BadRequestException('O levantamento deve estar entre 1.000 Kz e 1.000.000 Kz.');
    if (!method?.trim() || !account?.trim()) throw new BadRequestException('Informe o método e a conta de recebimento.');
    const wallet = await this.getOrCreateWallet(userId);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.driverWallet.findUnique({ where: { id: wallet.id } });
      if (!locked) throw new NotFoundException('Carteira não encontrada.');
      const available = locked.balance - locked.reservedBalance;
      if (available < amount) throw new ConflictException('Saldo disponível insuficiente para este levantamento.');
      const pending = await tx.walletWithdrawal.findFirst({ where: { walletId: locked.id, status: { in: [WalletWithdrawalStatus.PENDING, WalletWithdrawalStatus.APPROVED] } }, select: { id: true } });
      if (pending) throw new ConflictException('Já existe um levantamento em processamento.');
      await tx.driverWallet.update({ where: { id: locked.id }, data: { reservedBalance: { increment: amount } } });
      const withdrawal = await tx.walletWithdrawal.create({ data: { walletId: locked.id, amount, fee: 0, cashAmount: amount, method: method.trim(), account: account.trim(), reference: `WD-${randomUUID().slice(0, 10).toUpperCase()}` } });
      return { id: withdrawal.id, amount, fee: 0, cashAmount: amount, method: withdrawal.method, account: withdrawal.account, status: withdrawal.status, reference: withdrawal.reference, currency: 'AOA', createdAt: withdrawal.requestedAt };
    });
  }

  async listWithdrawals(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.prisma.walletWithdrawal.findMany({ where: { walletId: wallet.id }, orderBy: { requestedAt: 'desc' }, take: 200 });
  }

  async listPendingTopUps() {
    const topUps = await this.prisma.walletTopUp.findMany({ where: { status: WalletTopUpStatus.PENDING }, include: { wallet: { include: { driver: { select: { id: true, fullName: true, userId: true } } } } }, orderBy: { createdAt: 'asc' }, take: 200 });
    return topUps.map((topUp) => ({ id: topUp.id, driverId: topUp.wallet.driver.id, driverName: topUp.wallet.driver.fullName, amount: topUp.amount, status: topUp.status, reference: topUp.reference, currency: 'AOA', createdAt: topUp.createdAt }));
  }

  async decideTopUp(adminUserId: string, topUpId: string, approve: boolean, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const topUp = await tx.walletTopUp.findUnique({ where: { id: topUpId }, include: { wallet: { include: { driver: true } } } });
      if (!topUp) throw new NotFoundException('Solicitação de recarga não encontrada.');
      if (topUp.status !== WalletTopUpStatus.PENDING) throw new ConflictException('Esta solicitação já foi decidida.');
      if (!approve && !reason?.trim()) throw new BadRequestException('Informe o motivo para rejeitar a solicitação.');
      const status = approve ? WalletTopUpStatus.APPROVED : WalletTopUpStatus.REJECTED;
      const now = new Date();
      const changed = await tx.walletTopUp.updateMany({ where: { id: topUpId, status: WalletTopUpStatus.PENDING }, data: { status, reviewedById: adminUserId, reviewNote: reason?.trim() || null, reviewedAt: now } });
      if (changed.count !== 1) throw new ConflictException('A solicitação mudou de estado.');
      let balanceAfter: number | undefined;
      if (approve) {
        const wallet = await tx.driverWallet.update({ where: { id: topUp.walletId }, data: { balance: { increment: topUp.amount } } });
        balanceAfter = wallet.balance;
        await tx.walletTransaction.create({ data: { walletId: wallet.id, type: 'TOP_UP', amount: topUp.amount, balanceAfter: wallet.balance, description: 'Recarga confirmada pela administração.', reference: topUp.reference } });
      }
      await tx.auditLog.create({ data: { actorUserId: adminUserId, targetUserId: topUp.wallet.driver.userId, action: approve ? 'WALLET_TOP_UP_APPROVED' : 'WALLET_TOP_UP_REJECTED', reason: reason?.trim() || null, entity: 'WALLET_TOP_UP', entityId: topUp.id } });
      await tx.notification.create({ data: { userId: topUp.wallet.driver.userId, title: approve ? 'Recarga confirmada' : 'Recarga rejeitada', message: approve ? `A recarga ${topUp.reference} de ${topUp.amount.toLocaleString('pt-AO')} Kz foi confirmada.` : `A recarga ${topUp.reference} foi rejeitada${reason?.trim() ? `: ${reason.trim()}` : '.'}`, type: 'WALLET' } });
      return { id: topUp.id, amount: topUp.amount, status, reference: topUp.reference, currency: 'AOA', balanceAfter };
    });
  }

  async listPendingWithdrawals() {
    const rows = await this.prisma.walletWithdrawal.findMany({ where: { status: { in: [WalletWithdrawalStatus.PENDING, WalletWithdrawalStatus.APPROVED] } }, include: { wallet: { include: { driver: true } } }, orderBy: { requestedAt: 'asc' }, take: 200 });
    return rows.map((row) => ({ id: row.id, driverId: row.wallet.driver.id, driverUserId: row.wallet.driver.userId, driverName: row.wallet.driver.fullName, amount: row.amount, fee: row.fee, cashAmount: row.cashAmount, method: row.method, account: row.account, status: row.status, reference: row.reference, createdAt: row.requestedAt, approvedAt: row.approvedAt, paidAt: row.paidAt }));
  }

  async decideWithdrawal(adminUserId: string, id: string, action: WithdrawalAction, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({ where: { id }, include: { wallet: { include: { driver: true } } } });
      if (!withdrawal) throw new NotFoundException('Levantamento não encontrado.');
      if (action === 'REJECT') {
        if (withdrawal.status !== WalletWithdrawalStatus.PENDING && withdrawal.status !== WalletWithdrawalStatus.APPROVED) throw new ConflictException('Este levantamento não pode ser rejeitado.');
        if (!reason?.trim()) throw new BadRequestException('Informe o motivo da rejeição.');
        await tx.walletWithdrawal.update({ where: { id }, data: { status: WalletWithdrawalStatus.REJECTED, reviewNote: reason.trim(), reviewedById: adminUserId } });
        await tx.driverWallet.update({ where: { id: withdrawal.walletId }, data: { reservedBalance: { decrement: withdrawal.amount } } });
        await tx.auditLog.create({ data: { actorUserId: adminUserId, targetUserId: withdrawal.wallet.driver.userId, action: 'WALLET_WITHDRAWAL_REJECTED', reason: reason.trim(), entity: 'WALLET_WITHDRAWAL', entityId: withdrawal.id } });
        return { id, status: WalletWithdrawalStatus.REJECTED, reference: withdrawal.reference };
      }
      if (action === 'APPROVE') {
        if (withdrawal.status !== WalletWithdrawalStatus.PENDING) throw new ConflictException('Apenas levantamentos pendentes podem ser aprovados.');
        const updated = await tx.walletWithdrawal.updateMany({ where: { id, status: WalletWithdrawalStatus.PENDING }, data: { status: WalletWithdrawalStatus.APPROVED, approvedAt: new Date(), reviewedById: adminUserId, reviewNote: reason?.trim() || null } });
        if (updated.count !== 1) throw new ConflictException('O levantamento mudou de estado.');
        await tx.auditLog.create({ data: { actorUserId: adminUserId, targetUserId: withdrawal.wallet.driver.userId, action: 'WALLET_WITHDRAWAL_APPROVED', reason: reason?.trim() || null, entity: 'WALLET_WITHDRAWAL', entityId: withdrawal.id } });
        return { id, status: WalletWithdrawalStatus.APPROVED, reference: withdrawal.reference };
      }
      if (withdrawal.status !== WalletWithdrawalStatus.APPROVED) throw new ConflictException('O levantamento precisa estar aprovado antes do pagamento.');
      const wallet = await tx.driverWallet.update({ where: { id: withdrawal.walletId }, data: { balance: { decrement: withdrawal.amount }, reservedBalance: { decrement: withdrawal.amount } } });
      await tx.walletWithdrawal.update({ where: { id }, data: { status: WalletWithdrawalStatus.PAID, paidAt: new Date(), paidById: adminUserId } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, type: 'WITHDRAWAL', amount: -withdrawal.amount, balanceAfter: wallet.balance, description: `Levantamento pago em ${withdrawal.method}.`, reference: withdrawal.reference } });
      await tx.auditLog.create({ data: { actorUserId: adminUserId, targetUserId: withdrawal.wallet.driver.userId, action: 'WALLET_WITHDRAWAL_PAID', entity: 'WALLET_WITHDRAWAL', entityId: withdrawal.id } });
      await tx.notification.create({ data: { userId: withdrawal.wallet.driver.userId, title: 'Levantamento pago', message: `O levantamento ${withdrawal.reference} de ${withdrawal.cashAmount.toLocaleString('pt-AO')} Kz foi marcado como pago.`, type: 'WALLET' } });
      return { id, status: WalletWithdrawalStatus.PAID, reference: withdrawal.reference, balanceAfter: wallet.balance };
    });
  }

  async assertOperatingBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const available = wallet.balance - wallet.reservedBalance;
    if (available < wallet.minimumOperatingBalance) throw new ConflictException('O saldo disponível está abaixo do mínimo operacional.');
    return wallet;
  }

  private buildPriorityPolicy(minimum: number) {
    const base = Math.max(minimum, 1);
    const tiers = [
      { code: 'STANDARD', label: 'Operacional', minBalance: base, description: 'Saldo mínimo para permanecer elegível para despacho.' },
      { code: 'PLUS', label: 'Plus', minBalance: base * 2.5, description: 'Maior prioridade quando o perfil também cumpre os critérios de proximidade e qualidade.' },
      { code: 'PRIORITY', label: 'Priority', minBalance: base * 5, description: 'Prioridade superior para corridas elegíveis.' },
      { code: 'ELITE', label: 'Elite', minBalance: base * 10, description: 'Maior faixa de prioridade financeira, sujeita aos critérios operacionais.' },
    ];
    return { bands: tiers, factors: [
      { code: 'BALANCE', label: 'Saldo operacional', weight: 35, description: 'Quanto maior o saldo disponível, maior a componente financeira da prioridade.' },
      { code: 'DISTANCE', label: 'Proximidade', weight: 30, description: 'Entregadores mais próximos do ponto de recolha são favorecidos.' },
      { code: 'RELIABILITY', label: 'Confiabilidade', weight: 20, description: 'Taxa de aceitação e avaliação contribuem para a classificação.' },
      { code: 'CONTINUITY', label: 'Continuidade', weight: 15, description: 'O profissional que já entregou bem ao mesmo cliente pode receber uma preferência adicional.' },
    ] };
  }

  private bandForBalance(balance: number, bands: Array<{ code: string; minBalance: number }>) {
    return [...bands].reverse().find((band) => balance >= band.minBalance) ?? bands[0];
  }

  private calculatePriority(balance: number, distanceKm: number, acceptanceRate: number, rating: number, continuity: boolean) {
    const eliteThreshold = Math.max(this.minimumBalance() * 10, 1);
    const balanceScore = Math.min(100, (balance / eliteThreshold) * 100);
    const radius = this.dispatchRadiusKm();
    const distanceScore = Math.max(0, 100 - (distanceKm / radius) * 100);
    const reliabilityScore = Math.max(0, Math.min(100, acceptanceRate * 60 + (rating / 5) * 40));
    const continuityScore = continuity ? 100 : 0;
    const score = 0.35 * balanceScore + 0.30 * distanceScore + 0.20 * reliabilityScore + 0.15 * continuityScore;
    return { score: Number(score.toFixed(2)) };
  }

  private platformCommissionRate() { const rate = Number(process.env.PLATFORM_COMMISSION_RATE ?? '0.08'); return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.08; }
  private minimumBalance() { const value = Number(process.env.MINIMUM_DRIVER_OPERATING_BALANCE ?? '10000'); return Number.isSafeInteger(value) && value >= 0 ? value : 10000; }
  private dispatchRadiusKm() { const value = Number(process.env.DISPATCH_RADIUS_KM ?? '15'); return Number.isFinite(value) && value > 0 ? value : 15; }

  private async getProfessional(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId }, include: { user: { select: { role: true, status: true } } } });
    if (!driver) throw new NotFoundException('Perfil profissional não encontrado.');
    if (!([UserRole.DRIVER, UserRole.PRESTADOR] as UserRole[]).includes(driver.user.role) || driver.user.status !== AccountStatus.ACTIVE) throw new ConflictException('O profissional ainda não está autorizado a operar.');
    return driver;
  }

  private async getOrCreateWallet(userId: string) {
    const driver = await this.getProfessional(userId);
    const minimumOperatingBalance = this.minimumBalance();
    return this.prisma.driverWallet.upsert({ where: { driverId: driver.id }, create: { driverId: driver.id, minimumOperatingBalance }, update: { minimumOperatingBalance } });
  }
}
