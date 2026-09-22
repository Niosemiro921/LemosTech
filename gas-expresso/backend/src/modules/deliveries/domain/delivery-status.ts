import { BadRequestException } from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';

const deliveryTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  ASSIGNED: ['TO_PICKUP', 'CANCELLED'],
  TO_PICKUP: ['AT_PICKUP', 'CANCELLED'],
  AT_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!deliveryTransitions[from]?.includes(to)) {
    throw new BadRequestException(`Transição de entrega inválida: ${from} → ${to}.`);
  }
}

export const deliveryToOrderStatus: Partial<Record<DeliveryStatus, OrderStatus>> = {
  PICKED_UP: OrderStatus.PICKED_UP,
  IN_TRANSIT: OrderStatus.IN_TRANSIT,
  ARRIVED: OrderStatus.ARRIVED,
  DELIVERED: OrderStatus.DELIVERED,
};
