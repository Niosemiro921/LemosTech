import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  AdminReviewAction as PrismaAdminReviewAction,
  DeliveryStatus as PrismaDeliveryStatus,
  DriverOfferStatus as PrismaDriverOfferStatus,
  OrderStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DriverFinanceService } from '../../driver-finance/application/driver-finance.service';

interface CandidateDriver {
  id: string;
  userId: string;
  fullName: string;
  vehicleType: string;
  vehicleCapacityKg: number;
  latitude: number;
  longitude: number;
  ratingAverage: number;
  acceptanceRate: number;
  distanceKm: number;
  balance: number;
}

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driverFinance: DriverFinanceService,
  ) {}

  async startForOrder(orderId: string, maxOffers = 3, actorUserId?: string, actorRole?: UserRole) {
    if (maxOffers < 1 || maxOffers > 10) throw new ConflictException('maxOffers deve estar entre 1 e 10.');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, supplier: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (actorRole === UserRole.SUPPLIER) {
      const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId: actorUserId }, select: { id: true } });
      if (!supplier || order.supplierId !== supplier.id) throw new ConflictException('Este pedido não pertence ao fornecedor autenticado.');
    }
    if (!order.supplier || order.supplier.latitude === null || order.supplier.longitude === null) {
      throw new ConflictException('O fornecedor não tem localização operacional definida.');
    }

    if (order.status === OrderStatus.READY_FOR_PICKUP) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.order.updateMany({
          where: { id: order.id, status: OrderStatus.READY_FOR_PICKUP },
          data: { status: OrderStatus.DRIVER_SEARCHING },
        });
        if (changed.count !== 1) throw new ConflictException('O pedido mudou de estado. Tente novamente.');
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.DRIVER_SEARCHING,
            note: 'Dispatch iniciado: procurando entregadores elegíveis.',
          },
        });
        if (actorRole === UserRole.ADMIN && actorUserId) {
          await tx.auditLog.create({
            data: {
              actorUserId,
              action: PrismaAdminReviewAction.DISPATCH_RETRIED,
              reason: 'Reexecução de dispatch solicitada.',
              entity: 'ORDER',
              entityId: order.id,
            },
          });
        }
      });
    } else if (order.status !== OrderStatus.DRIVER_SEARCHING) {
      throw new ConflictException(`O dispatch não pode começar no estado ${order.status}.`);
    } else if (actorRole === UserRole.ADMIN && actorUserId) {
      await this.prisma.auditLog.create({
        data: {
          actorUserId,
          action: PrismaAdminReviewAction.DISPATCH_RETRIED,
          reason: 'Reexecução de dispatch solicitada.',
          entity: 'ORDER',
          entityId: order.id,
        },
      });
    }

    const totalWeightKg = order.items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
    const candidates = await this.findCandidates(order.supplier.latitude!, order.supplier.longitude!, totalWeightKg);
    if (!candidates.length) {
      return {
        orderId: order.id,
        status: OrderStatus.DRIVER_SEARCHING,
        offersCreated: 0,
        message: 'Nenhum entregador elegível online no raio configurado.',
      } as const;
    }

    await this.prisma.driverOffer.updateMany({
      where: { orderId: order.id, status: PrismaDriverOfferStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: PrismaDriverOfferStatus.EXPIRED, respondedAt: new Date() },
    });
    const existing = await this.prisma.driverOffer.findMany({
      where: { orderId: order.id, status: PrismaDriverOfferStatus.PENDING },
      select: { driverId: true },
    });
    const existingDriverIds = new Set(existing.map((offer) => offer.driverId));
    const freshCandidates = candidates.filter((driver) => !existingDriverIds.has(driver.id)).slice(0, maxOffers);
    if (!freshCandidates.length) {
      return {
        orderId: order.id,
        status: OrderStatus.DRIVER_SEARCHING,
        offersCreated: 0,
        message: 'Já existem ofertas pendentes para este pedido.',
      } as const;
    }

    const expiresAt = new Date(Date.now() + this.offerTtlMs());
    const created = await this.prisma.$transaction(async (tx) => {
      const offers: Array<Record<string, unknown>> = [];
      for (const driver of freshCandidates) {
        const pickupDistanceKm = this.haversine(
          order.supplier!.latitude!,
          order.supplier!.longitude!,
          driver.latitude,
          driver.longitude,
        );
        const estimatedPickupMinutes = this.estimatePickupMinutes(pickupDistanceKm);

        try {
          const offer = await tx.driverOffer.create({
            data: {
              orderId: order.id,
              driverId: driver.id,
              distanceToPickupKm: Number(pickupDistanceKm.toFixed(2)),
              estimatedPickupMinutes,
              expiresAt,
              status: PrismaDriverOfferStatus.PENDING,
            },
          });
          offers.push({
            id: offer.id,
            driverId: driver.id,
            driverName: driver.fullName,
            distanceToPickupKm: offer.distanceToPickupKm,
            estimatedPickupMinutes: offer.estimatedPickupMinutes,
            expiresAt: offer.expiresAt,
          });
        } catch (error) {
          if ((error as { code?: string })?.code !== 'P2002') throw error;
        }
      }
      return offers;
    });

    return {
      orderId: order.id,
      status: OrderStatus.DRIVER_SEARCHING,
      offersCreated: created.length,
      offers: created,
    } as const;
  }

  async listDriverOffers(userId: string) {
    const driver = await this.getDriver(userId);
    await this.expireOffers(driver.id);

    const offers = await this.prisma.driverOffer.findMany({
      where: { driverId: driver.id, status: PrismaDriverOfferStatus.PENDING },
      include: {
        order: {
          include: {
            items: true,
            supplier: { select: { id: true, tradeName: true, latitude: true, longitude: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers.map((offer) => ({
      id: offer.id,
      expiresAt: offer.expiresAt,
      distanceToPickupKm: offer.distanceToPickupKm,
      estimatedPickupMinutes: offer.estimatedPickupMinutes,
      order: this.publicOrder(offer.order),
    }));
  }

  async getDriverStatus(userId: string) {
    const driver = await this.getDriver(userId);
    const completedDeliveries = await this.prisma.delivery.count({
      where: { driverId: driver.id, status: PrismaDeliveryStatus.DELIVERED },
    });
    return {
      id: driver.id,
      fullName: driver.fullName,
      vehicleType: driver.vehicleType,
      isOnline: driver.isOnline,
      latitude: driver.latitude,
      longitude: driver.longitude,
      ratingAverage: driver.ratingAverage,
      completedDeliveries,
    };
  }

  async getAdminQueue() {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.DRIVER_SEARCHING] } },
      include: {
        items: true,
        supplier: { select: { tradeName: true, latitude: true, longitude: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return Promise.all(orders.map(async (order) => {
      const candidates = order.supplier && order.supplier.latitude !== null && order.supplier.longitude !== null
        ? await this.findCandidates(
            order.supplier.latitude,
            order.supplier.longitude,
            order.items.reduce((total, item) => total + item.weightKg * item.quantity, 0),
          )
        : [];
      const recommended = candidates[0];

      return {
        orderId: order.id,
        reference: order.reference,
        status: order.status,
        pickup: {
          address: order.supplier?.tradeName ?? 'Fornecedor indisponível',
          latitude: order.supplier?.latitude ?? null,
          longitude: order.supplier?.longitude ?? null,
        },
        dropoff: {
          address: order.deliveryAddress,
          latitude: order.latitude,
          longitude: order.longitude,
        },
        recommendedDriver: recommended
          ? {
              id: recommended.id,
              name: recommended.fullName,
              priorityScore: Number((-this.scoreCandidate(recommended)).toFixed(2)),
              balance: recommended.balance,
              distanceKm: Number(recommended.distanceKm.toFixed(2)),
            }
          : null,
      };
    }));
  }

  async rejectDriverOffer(userId: string, offerId: string) {
    const driver = await this.getDriver(userId);
    await this.expireOffers(driver.id);
    const changed = await this.prisma.driverOffer.updateMany({
      where: { id: offerId, driverId: driver.id, status: PrismaDriverOfferStatus.PENDING },
      data: { status: PrismaDriverOfferStatus.REJECTED, respondedAt: new Date() },
    });
    if (changed.count !== 1) throw new ConflictException('Oferta inexistente, já respondida ou expirada.');
    return { offerId, status: PrismaDriverOfferStatus.REJECTED } as const;
  }

  async acceptDriverOffer(userId: string, offerId: string) {
    const driver = await this.getDriver(userId);
    await this.expireOffers(driver.id);

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.driverOffer.findFirst({
        where: { id: offerId, driverId: driver.id, status: PrismaDriverOfferStatus.PENDING },
        include: { order: { include: { supplier: true } } },
      });
      if (!offer) throw new ConflictException('Oferta inexistente, já respondida ou expirada.');
      if (offer.expiresAt.getTime() <= Date.now()) {
        await tx.driverOffer.update({
          where: { id: offer.id },
          data: { status: PrismaDriverOfferStatus.EXPIRED, respondedAt: new Date() },
        });
        throw new ConflictException('Esta oferta expirou.');
      }

      const busyDelivery = await tx.delivery.findFirst({
        where: {
          driverId: driver.id,
          status: {
            in: [
              PrismaDeliveryStatus.ASSIGNED,
              PrismaDeliveryStatus.TO_PICKUP,
              PrismaDeliveryStatus.AT_PICKUP,
              PrismaDeliveryStatus.PICKED_UP,
              PrismaDeliveryStatus.IN_TRANSIT,
              PrismaDeliveryStatus.ARRIVED,
            ],
          },
        },
        select: { id: true },
      });
      if (busyDelivery) throw new ConflictException('Já existe uma entrega ativa para este entregador.');

      const orderClaim = await tx.order.updateMany({
        where: { id: offer.orderId, status: OrderStatus.DRIVER_SEARCHING },
        data: { status: OrderStatus.DRIVER_ASSIGNED },
      });
      if (orderClaim.count !== 1) throw new ConflictException('Outro entregador já assumiu este pedido.');

      await tx.driverOffer.update({
        where: { id: offer.id },
        data: { status: PrismaDriverOfferStatus.ACCEPTED, respondedAt: new Date() },
      });
      await tx.driverOffer.updateMany({
        where: { orderId: offer.orderId, status: PrismaDriverOfferStatus.PENDING, id: { not: offer.id } },
        data: { status: PrismaDriverOfferStatus.REJECTED, respondedAt: new Date() },
      });

      const delivery = await tx.delivery.create({
        data: {
          orderId: offer.orderId,
          driverId: driver.id,
          status: PrismaDeliveryStatus.ASSIGNED,
          pickupAddress: offer.order.supplier?.tradeName ?? 'Fornecedor',
          pickupLatitude: offer.order.supplier?.latitude ?? 0,
          pickupLongitude: offer.order.supplier?.longitude ?? 0,
          dropoffAddress: offer.order.deliveryAddress,
          dropoffLatitude: offer.order.latitude,
          dropoffLongitude: offer.order.longitude,
          assignedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: offer.orderId,
          status: OrderStatus.DRIVER_ASSIGNED,
          note: `Entregador ${driver.fullName} foi associado ao pedido.`,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: offer.orderId,
          status: OrderStatus.DRIVER_ACCEPTED,
          note: `Entregador ${driver.fullName} aceitou a entrega.`,
        },
      });
      await tx.order.update({
        where: { id: offer.orderId },
        data: { status: OrderStatus.DRIVER_ACCEPTED },
      });

      return {
        offerId: offer.id,
        orderId: offer.orderId,
        deliveryId: delivery.id,
        status: OrderStatus.DRIVER_ACCEPTED,
        driver: { id: driver.id, fullName: driver.fullName, vehicleType: driver.vehicleType },
      } as const;
    });
  }

  async startDriver(userId: string, latitude: number, longitude: number) {
    const driver = await this.getDriver(userId);
    await this.driverFinance.assertOperatingBalance(userId);
    return this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: { isOnline: true, latitude, longitude, lastLocationAt: new Date() },
      select: { id: true, fullName: true, isOnline: true, latitude: true, longitude: true, lastLocationAt: true },
    });
  }

  async stopDriver(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: { isOnline: false },
      select: { id: true, fullName: true, isOnline: true },
    });
  }

  async updateDriverLocation(userId: string, latitude: number, longitude: number) {
    const driver = await this.getDriver(userId);
    return this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: { latitude, longitude, lastLocationAt: new Date() },
      select: { id: true, fullName: true, isOnline: true, latitude: true, longitude: true, lastLocationAt: true },
    });
  }

  async getCustomerTracking(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        supplier: { select: { id: true, tradeName: true, latitude: true, longitude: true } },
        delivery: { include: { driver: { include: { user: { select: { phone: true } } } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    return {
      order: this.publicOrder(order),
      delivery: order.delivery
        ? {
            id: order.delivery.id,
            status: order.delivery.status,
            driver: {
              id: order.delivery.driver.id,
              fullName: order.delivery.driver.fullName,
              phone: order.delivery.driver.user.phone,
              vehicleType: order.delivery.driver.vehicleType,
              latitude: order.delivery.driver.latitude,
              longitude: order.delivery.driver.longitude,
              ratingAverage: order.delivery.driver.ratingAverage,
            },
            pickup: {
              address: order.delivery.pickupAddress,
              latitude: order.delivery.pickupLatitude,
              longitude: order.delivery.pickupLongitude,
            },
            dropoff: {
              address: order.delivery.dropoffAddress,
              latitude: order.delivery.dropoffLatitude,
              longitude: order.delivery.dropoffLongitude,
            },
            timestamps: {
              assignedAt: order.delivery.assignedAt,
              acceptedAt: order.delivery.acceptedAt,
              pickedUpAt: order.delivery.pickedUpAt,
              arrivedAt: order.delivery.arrivedAt,
              deliveredAt: order.delivery.deliveredAt,
            },
          }
        : null,
    };
  }

  private async getDriver(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!driver) throw new NotFoundException('Perfil de entregador não encontrado.');
    if (driver.user.status !== AccountStatus.ACTIVE || driver.user.role !== UserRole.DRIVER) {
      throw new ConflictException('O entregador ainda não está autorizado a operar.');
    }
    return driver;
  }

  private async findCandidates(latitude: number, longitude: number, totalWeightKg: number): Promise<CandidateDriver[]> {
    const minimumBalance = Number(process.env.MINIMUM_DRIVER_OPERATING_BALANCE ?? '10000');
    const drivers = await this.prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        latitude: { not: null },
        longitude: { not: null },
        vehicleCapacityKg: { gte: totalWeightKg },
        user: { status: AccountStatus.ACTIVE, role: UserRole.DRIVER },
        wallet: { is: { balance: { gte: Number.isSafeInteger(minimumBalance) && minimumBalance >= 0 ? minimumBalance : 10000 } } },
        deliveries: {
          none: {
            status: {
              in: [
                PrismaDeliveryStatus.ASSIGNED,
                PrismaDeliveryStatus.TO_PICKUP,
                PrismaDeliveryStatus.AT_PICKUP,
                PrismaDeliveryStatus.PICKED_UP,
                PrismaDeliveryStatus.IN_TRANSIT,
                PrismaDeliveryStatus.ARRIVED,
              ],
            },
          },
        },
      },
      orderBy: [{ ratingAverage: 'desc' }, { acceptanceRate: 'desc' }],
      include: { wallet: { select: { balance: true } } },
      take: 100,
    });

    const radius = this.dispatchRadiusKm();
    return drivers
      .map((driver) => {
        const distanceKm = this.haversine(
          latitude,
          longitude,
          driver.latitude as number,
          driver.longitude as number,
        );
        return {
          id: driver.id,
          userId: driver.userId,
          fullName: driver.fullName,
          vehicleType: driver.vehicleType,
          vehicleCapacityKg: driver.vehicleCapacityKg,
          latitude: driver.latitude as number,
          longitude: driver.longitude as number,
          ratingAverage: driver.ratingAverage,
          acceptanceRate: driver.acceptanceRate,
          distanceKm,
          balance: driver.wallet?.balance ?? 0,
        };
      })
      .filter((driver) => driver.distanceKm <= radius)
      .sort((a, b) => this.scoreCandidate(a) - this.scoreCandidate(b));
  }

  private scoreCandidate(driver: CandidateDriver) {
    const distancePenalty = driver.distanceKm * 10;
    const reliabilityBonus = driver.acceptanceRate * 2 + driver.ratingAverage;
    return distancePenalty - reliabilityBonus;
  }

  private async expireOffers(driverId: string) {
    await this.prisma.driverOffer.updateMany({
      where: { driverId, status: PrismaDriverOfferStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: PrismaDriverOfferStatus.EXPIRED, respondedAt: new Date() },
    });
  }

  private offerTtlMs() {
    const seconds = Number(process.env.DISPATCH_OFFER_TTL_SECONDS ?? '30');
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30000;
  }

  private dispatchRadiusKm() {
    const value = Number(process.env.DISPATCH_RADIUS_KM ?? '15');
    return Number.isFinite(value) && value > 0 ? value : 15;
  }

  private estimatePickupMinutes(distanceKm: number) {
    return Math.max(5, Math.ceil(distanceKm * 4) + 4);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const rad = (value: number) => (value * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }

  private publicOrder(order: any) {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
      scheduledAt: order.scheduledAt,
      pricing: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        platformFee: order.platformFee,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        distanceKm: order.distanceKm,
        estimatedMinutes: order.estimatedMinutes,
        pricingVersion: order.pricingVersion,
      },
      supplier: order.supplier
        ? {
            id: order.supplier.id,
            tradeName: order.supplier.tradeName,
            latitude: order.supplier.latitude,
            longitude: order.supplier.longitude,
          }
        : null,
      items: order.items ?? [],
      statusHistory: order.statusHistory ?? [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
