import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DriverProfileInput, DriverProfileUpdate, DriverRepositoryPort } from '../domain/driver.repository';

@Injectable()
export class DriverService extends DriverRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: DriverProfileInput): Promise<void> {
    await this.prisma.driverProfile.create({ data: input });
  }

  async getByUserId(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true, status: true, phone: true, email: true } } },
    });
    if (!driver) throw new NotFoundException('Perfil profissional não encontrado.');
    const completedDeliveries = await this.prisma.delivery.count({ where: { driverId: driver.id, status: 'DELIVERED' } });
    return { ...driver, completedDeliveries };
  }

  async updateByUserId(userId: string, input: DriverProfileUpdate) {
    await this.getByUserId(userId);
    return this.prisma.driverProfile.update({
      where: { userId },
      data: {
        ...input,
        ...(input.fullName === undefined ? {} : { fullName: input.fullName.trim() }),
        ...(input.documentNumber === undefined ? {} : { documentNumber: input.documentNumber.trim() }),
        ...(input.vehicleType === undefined ? {} : { vehicleType: input.vehicleType.trim() }),
      },
    });
  }

  // --- Métodos para endpoints de ofertas ---
  async getMyOffers(userId: string, query?: any) {
    const driver = await this.getByUserId(userId);
    // Em uma implementação completa, busca ofertas de entrega pendentes
    return { offers: [], driverId: driver.id };
  }

  async acceptOffer(userId: string, offerId: string) {
    return { accepted: true, offerId, userId };
  }

  async rejectOffer(userId: string, offerId: string) {
    return { rejected: true, offerId, userId };
  }

  // --- Métodos para status online/offline ---
  async setOnlineStatus(userId: string, isOnline: boolean) {
    await this.prisma.driverProfile.update({ where: { userId }, data: { isOnline } });
    return { userId, isOnline, status: isOnline ? 'ONLINE' : 'OFFLINE' };
  }

  // --- Método para localização ---
  async updateLocation(userId: string, body: any) {
    return { updated: true, userId, latitude: body.latitude, longitude: body.longitude, timestamp: body.timestamp };
  }

  // --- Métodos para wallet ---
  async getWallet(userId: string) {
    const driver = await (this.prisma as any).driverProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!driver) throw new NotFoundException('Perfil do entregador não encontrado.');
    const wallet = await (this.prisma as any).driverWallet.findUnique({ where: { driverId: driver.id } });
    if (!wallet) throw new NotFoundException('Carteira não encontrada.');
    return { currency: wallet.currency, balance: wallet.balance, reservedBalance: wallet.reservedBalance, availableBalance: wallet.availableBalance, minimumOperatingBalance: wallet.minimumOperatingBalance, priorityScore: wallet.priorityScore, priorityBand: wallet.priorityBand };
  }

  async getWalletTransactions(userId: string, query?: any) {
    const driver = await (this.prisma as any).driverProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!driver) throw new NotFoundException('Perfil do entregador não encontrado.');
    const wallet = await (this.prisma as any).driverWallet.findUnique({ where: { driverId: driver.id }, select: { id: true } });
    if (!wallet) throw new NotFoundException('Carteira não encontrada.');
    const transactions = await (this.prisma as any).walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 20,
      skip: query?.offset || 0,
    });
    return { transactions, total: transactions.length };
  }

  async topUpWallet(userId: string, body: any) {
    // Em produção: confirmar pagamento via gateway
    return { topUpId: 'pending', amount: body.amount, status: 'PENDING_CONFIRMATION', userId };
  }
}