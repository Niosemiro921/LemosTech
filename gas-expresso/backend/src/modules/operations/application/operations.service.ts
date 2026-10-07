import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Role } from '../../../shared/domain/auth.enums';
import {
  CreateAddressDto,
  CreateIncidentDto,
  CreateSupportTicketDto,
  UpdateAddressDto,
  UpdateScheduleDayDto,
} from '../dto/operations.dto';

const DAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(userId: string) {
    await this.requireRole(userId, UserRole.CUSTOMER);
    return this.prisma.customerAddress.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    await this.requireRole(userId, UserRole.CUSTOMER);
    this.assertCoordinatePair(dto.latitude, dto.longitude);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.customerAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      const firstAddress = (await tx.customerAddress.count({ where: { userId } })) === 0;
      return tx.customerAddress.create({
        data: {
          userId,
          label: dto.label.trim(),
          address: dto.address.trim(),
          reference: cleanOptional(dto.reference),
          municipality: cleanOptional(dto.municipality),
          province: cleanOptional(dto.province),
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          isDefault: dto.isDefault ?? firstAddress,
        },
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.requireRole(userId, UserRole.CUSTOMER);
    const current = await this.prisma.customerAddress.findFirst({ where: { id: addressId, userId } });
    if (!current) throw new NotFoundException('Endereço não encontrado.');
    const latitude = dto.latitude === undefined ? current.latitude : dto.latitude;
    const longitude = dto.longitude === undefined ? current.longitude : dto.longitude;
    this.assertCoordinatePair(latitude, longitude);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.customerAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.label === undefined ? {} : { label: dto.label.trim() }),
          ...(dto.address === undefined ? {} : { address: dto.address.trim() }),
          ...(dto.reference === undefined ? {} : { reference: cleanOptional(dto.reference) }),
          ...(dto.municipality === undefined ? {} : { municipality: cleanOptional(dto.municipality) }),
          ...(dto.province === undefined ? {} : { province: cleanOptional(dto.province) }),
          ...(dto.latitude === undefined ? {} : { latitude: dto.latitude }),
          ...(dto.longitude === undefined ? {} : { longitude: dto.longitude }),
          ...(dto.isDefault === undefined ? {} : { isDefault: dto.isDefault }),
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.requireRole(userId, UserRole.CUSTOMER);
    const deleted = await this.prisma.customerAddress.deleteMany({ where: { id: addressId, userId } });
    if (deleted.count !== 1) throw new NotFoundException('Endereço não encontrado.');
    return { id: addressId, deleted: true };
  }

  async listNotifications(userId: string) {
    await this.requireAccount(userId);
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.requireAccount(userId);
    const changed = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (changed.count === 0) {
      const exists = await this.prisma.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notificação não encontrada.');
    }
    return { id: notificationId, read: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.requireAccount(userId);
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  async listSupportTickets(userId: string) {
    await this.requireAccount(userId);
    const tickets = await this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    return tickets.map((ticket) => ({
      id: ticket.id,
      reference: ticket.reference,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastMessage: ticket.message,
    }));
  }

  async createSupportTicket(userId: string, dto: CreateSupportTicketDto) {
    await this.requireAccount(userId);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        category: dto.category.trim(),
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        reference: `SUP-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });
    return {
      id: ticket.id,
      reference: ticket.reference,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastMessage: ticket.message,
    };
  }

  async listIncidents(userId: string) {
    await this.requirePartner(userId);
    return this.prisma.incident.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async createIncident(userId: string, dto: CreateIncidentDto) {
    const user = await this.requirePartner(userId);
    if (dto.orderId) {
      const orderWhere = user.role === UserRole.DRIVER
        ? {
            id: dto.orderId,
            OR: [
              { delivery: { driver: { userId } } },
              { driverOffers: { some: { driver: { userId } } } },
            ],
          }
        : { id: dto.orderId, supplier: { userId } };
      const order = await this.prisma.order.findFirst({ where: orderWhere, select: { id: true } });
      if (!order) throw new NotFoundException('Pedido não encontrado para este parceiro.');
    }

    const incident = await this.prisma.incident.create({
      data: {
        userId,
        orderId: dto.orderId ?? null,
        category: dto.category.trim(),
        severity: dto.severity,
        description: dto.description.trim(),
        reference: `INC-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });
    return incident;
  }

  async listDocuments(userId: string, role: Role) {
    await this.requireRole(userId, role === Role.DRIVER ? UserRole.DRIVER : UserRole.SUPPLIER);
    return this.prisma.businessDocument.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } });
  }

  async requestDocumentReview(userId: string, role: Role, documentId: string) {
    await this.requireRole(userId, role === Role.DRIVER ? UserRole.DRIVER : UserRole.SUPPLIER);
    const document = await this.prisma.businessDocument.findFirst({ where: { id: documentId, userId } });
    if (!document) throw new NotFoundException('Documento não encontrado.');
    if (document.status !== 'REJECTED') {
      throw new ConflictException('Só é possível solicitar nova revisão para um documento rejeitado.');
    }
    if (document.expiresAt && document.expiresAt <= new Date()) {
      throw new ConflictException('O documento está expirado e precisa ser substituído antes da revisão.');
    }
    const changed = await this.prisma.businessDocument.updateMany({
      where: { id: document.id, userId, status: 'REJECTED' },
      data: { status: 'PENDING_REVIEW', reviewNote: null, reviewedAt: null },
    });
    if (changed.count !== 1) throw new ConflictException('O estado do documento mudou. Atualize e tente novamente.');
    return this.prisma.businessDocument.findUniqueOrThrow({ where: { id: document.id } });
  }

  async listCompanyTeam(userId: string) {
    await this.requireRole(userId, UserRole.SUPPLIER);
    const supplier = await this.prisma.supplierProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!supplier) throw new NotFoundException('Perfil de empresa não encontrado.');
    return [{
      id: supplier.user.id,
      name: supplier.responsibleName,
      phone: supplier.user.phone,
      email: supplier.user.email,
      role: 'OWNER',
      status: supplier.user.status,
    }];
  }

  async getCompanySchedule(userId: string) {
    const supplier = await this.requireSupplier(userId);
    const schedules = await this.prisma.supplierSchedule.findMany({ where: { supplierId: supplier.id } });
    const byDay = new Map(schedules.map((item) => [item.dayOfWeek, item]));
    return DAY_LABELS.map((label, dayOfWeek) => {
      const schedule = byDay.get(dayOfWeek);
      return {
        dayOfWeek,
        label,
        enabled: schedule?.enabled ?? false,
        openTime: schedule?.openTime ?? null,
        closeTime: schedule?.closeTime ?? null,
      };
    });
  }

  async updateCompanySchedule(userId: string, schedules: UpdateScheduleDayDto[]) {
    const supplier = await this.requireSupplier(userId);
    const days = new Set(schedules.map((item) => item.dayOfWeek));
    if (days.size !== 7 || days.size !== schedules.length) {
      throw new BadRequestException('Envie exatamente um horário para cada dia da semana.');
    }
    for (const item of schedules) {
      if (item.enabled && (!item.openTime || !item.closeTime || item.openTime >= item.closeTime)) {
        throw new BadRequestException(`Informe um horário de abertura e fecho válido para ${DAY_LABELS[item.dayOfWeek]}.`);
      }
    }

    await this.prisma.$transaction(schedules.map((item) => this.prisma.supplierSchedule.upsert({
      where: { supplierId_dayOfWeek: { supplierId: supplier.id, dayOfWeek: item.dayOfWeek } },
      create: {
        supplierId: supplier.id,
        dayOfWeek: item.dayOfWeek,
        enabled: item.enabled,
        openTime: item.enabled ? item.openTime! : null,
        closeTime: item.enabled ? item.closeTime! : null,
      },
      update: {
        enabled: item.enabled,
        openTime: item.enabled ? item.openTime! : null,
        closeTime: item.enabled ? item.closeTime! : null,
      },
    })));
    return this.getCompanySchedule(userId);
  }

  async getInventoryAvailability(latitude: number, longitude: number) {
    const suppliers = await this.prisma.supplierProfile.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        user: { role: UserRole.SUPPLIER, status: AccountStatus.ACTIVE },
        inventory: { some: { availableQty: { gt: 0 }, variant: { active: true } } },
      },
      select: {
        id: true,
        tradeName: true,
        latitude: true,
        longitude: true,
        inventory: {
          where: { availableQty: { gt: 0 }, variant: { active: true } },
          select: { availableQty: true, reservedQty: true },
        },
      },
    });
    const nearest = suppliers
      .map((supplier) => ({
        supplier,
        distance: this.haversine(latitude, longitude, supplier.latitude!, supplier.longitude!),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest) return { supplier: null };
    return {
      supplier: {
        supplierId: nearest.supplier.id,
        supplierName: nearest.supplier.tradeName,
        availableQty: nearest.supplier.inventory.reduce((sum, item) => sum + item.availableQty, 0),
        reservedQty: nearest.supplier.inventory.reduce((sum, item) => sum + item.reservedQty, 0),
      },
    };
  }

  private async requireAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user) throw new NotFoundException('Conta não encontrada.');
    if (user.status !== AccountStatus.ACTIVE) throw new ConflictException('A conta não está ativa.');
    return user;
  }

  private async requireRole(userId: string, role: UserRole) {
    const user = await this.requireAccount(userId);
    if (user.role !== role) throw new NotFoundException('Perfil não encontrado.');
    return user;
  }

  private async requirePartner(userId: string) {
    const user = await this.requireAccount(userId);
    if (user.role !== UserRole.DRIVER && user.role !== UserRole.SUPPLIER) {
      throw new NotFoundException('Perfil de parceiro não encontrado.');
    }
    return user;
  }

  private async requireSupplier(userId: string) {
    await this.requireRole(userId, UserRole.SUPPLIER);
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Perfil de empresa não encontrado.');
    return supplier;
  }

  private assertCoordinatePair(latitude: number | null | undefined, longitude: number | null | undefined) {
    if ((latitude == null) !== (longitude == null)) {
      throw new BadRequestException('Latitude e longitude devem ser informadas em conjunto.');
    }
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const rad = (value: number) => (value * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }
}

function cleanOptional(value: string | null | undefined) {
  return value?.trim() || null;
}
