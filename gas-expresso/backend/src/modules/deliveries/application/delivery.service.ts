import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, DeliveryStatus, OrderStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { assertDeliveryTransition, deliveryToOrderStatus } from '../domain/delivery-status';

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.TO_PICKUP,
  DeliveryStatus.AT_PICKUP,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.ARRIVED,
];

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentForDriver(userId: string) {
    const driver = await this.getActiveDriver(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { driverId: driver.id, status: { in: ACTIVE_DELIVERY_STATUSES } },
      include: {
        order: {
          include: {
            items: true,
            supplier: { select: { id: true, tradeName: true, latitude: true, longitude: true } },
          },
        },
        driver: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return delivery ? this.publicDelivery(delivery) : null;
  }

  async getByIdForDriver(userId: string, deliveryId: string) {
    const driver = await this.getActiveDriver(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, driverId: driver.id },
      include: {
        order: {
          include: {
            items: true,
            supplier: { select: { id: true, tradeName: true, latitude: true, longitude: true } },
          },
        },
        driver: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    return this.publicDelivery(delivery);
  }

  async transitionForDriver(userId: string, deliveryId: string, to: DeliveryStatus, note?: string, latitude?: number, longitude?: number) {
    const driver = await this.getActiveDriver(userId);

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, driverId: driver.id },
        include: { order: true },
      });
      if (!delivery) throw new NotFoundException('Entrega não encontrada.');

      assertDeliveryTransition(delivery.status, to);

      const now = new Date();
      const deliveryData: Record<string, unknown> = {};
      if (to === DeliveryStatus.TO_PICKUP && !delivery.acceptedAt) deliveryData.acceptedAt = now;
      if (to === DeliveryStatus.PICKED_UP) deliveryData.pickedUpAt = now;
      if (to === DeliveryStatus.ARRIVED) deliveryData.arrivedAt = now;
      if (to === DeliveryStatus.DELIVERED) deliveryData.deliveredAt = now;

      const updated = await tx.delivery.updateMany({
        where: { id: delivery.id, driverId: driver.id, status: delivery.status },
        data: { ...deliveryData, status: to },
      });
      if (updated.count !== 1) throw new ConflictException('A entrega mudou de estado. Atualize e tente novamente.');

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          status: to,
          note: note?.trim() || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
        },
      });

      const nextOrderStatus = deliveryToOrderStatus[to];
      if (nextOrderStatus) {
        const orderChange = await tx.order.updateMany({
          where: { id: delivery.orderId, status: { not: nextOrderStatus } },
          data: { status: nextOrderStatus },
        });
        if (orderChange.count === 1) {
          const order = await tx.order.findUniqueOrThrow({
            where: { id: delivery.orderId },
            select: { customerId: true, reference: true },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: delivery.orderId,
              status: nextOrderStatus,
              note: note?.trim() || `Entrega avançou para ${to}.`,
            },
          });
          await tx.notification.create({
            data: {
              userId: order.customerId,
              title: 'Estado da entrega atualizado',
              message: `A entrega do pedido ${order.reference} avançou para ${nextOrderStatus}.`,
              type: 'DELIVERY',
            },
          });
        }
      }

      if (to === DeliveryStatus.DELIVERED) {
        await tx.order.updateMany({
          where: { id: delivery.orderId, status: OrderStatus.DELIVERED },
          data: { status: OrderStatus.COMPLETED },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: delivery.orderId,
            status: OrderStatus.COMPLETED,
            note: 'Entrega concluída. Pagamento deve ser tratado no momento da entrega.',
          },
        });
      }

      return this.getByIdWithClient(tx, delivery.id);
    });
  }

  private async getByIdWithClient(tx: Prisma.TransactionClient, deliveryId: string) {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            items: true,
            supplier: { select: { id: true, tradeName: true, latitude: true, longitude: true } },
          },
        },
        driver: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    return this.publicDelivery(delivery);
  }

  private async getActiveDriver(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!driver) throw new NotFoundException('Perfil de entregador não encontrado.');
    if (!([UserRole.DRIVER, UserRole.PRESTADOR] as UserRole[]).includes(driver.user.role) || driver.user.status !== AccountStatus.ACTIVE) {
      throw new ConflictException('O entregador ainda não está autorizado a operar.');
    }
    return driver;
  }

  private publicDelivery(delivery: any) {
    return {
      id: delivery.id,
      status: delivery.status,
      assignedAt: delivery.assignedAt,
      acceptedAt: delivery.acceptedAt,
      pickedUpAt: delivery.pickedUpAt,
      arrivedAt: delivery.arrivedAt,
      deliveredAt: delivery.deliveredAt,
      pickup: {
        address: delivery.pickupAddress,
        latitude: delivery.pickupLatitude,
        longitude: delivery.pickupLongitude,
      },
      dropoff: {
        address: delivery.dropoffAddress,
        latitude: delivery.dropoffLatitude,
        longitude: delivery.dropoffLongitude,
      },
      driver: {
        id: delivery.driver.id,
        fullName: delivery.driver.fullName,
        vehicleType: delivery.driver.vehicleType,
        ratingAverage: delivery.driver.ratingAverage,
        latitude: delivery.driver.latitude,
        longitude: delivery.driver.longitude,
      },
      order: {
        id: delivery.order.id,
        reference: delivery.order.reference,
        status: delivery.order.status,
        deliveryAddress: delivery.order.deliveryAddress,
        paymentMethod: delivery.order.paymentMethod,
        items: delivery.order.items ?? [],
        pricing: {
          subtotal: delivery.order.subtotal,
          deliveryFee: delivery.order.deliveryFee,
          platformFee: delivery.order.platformFee,
          discount: delivery.order.discount,
          total: delivery.order.total,
          currency: delivery.order.currency,
          distanceKm: delivery.order.distanceKm,
          estimatedMinutes: delivery.order.estimatedMinutes,
        },
        supplier: delivery.order.supplier
          ? {
              id: delivery.order.supplier.id,
              tradeName: delivery.order.supplier.tradeName,
              latitude: delivery.order.supplier.latitude,
              longitude: delivery.order.supplier.longitude,
            }
          : null,
      },
      statusHistory: delivery.statusHistory ?? [],
    };
  }
}
