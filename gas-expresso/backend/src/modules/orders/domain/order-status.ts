import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['AWAITING_SUPPLIER_ACCEPTANCE', 'CANCELLED'],
  AWAITING_SUPPLIER_ACCEPTANCE: ['SUPPLIER_ACCEPTED', 'CANCELLED', 'FAILED'],
  SUPPLIER_ACCEPTED: ['PREPARING', 'CANCELLED', 'FAILED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED', 'FAILED'],
  READY_FOR_PICKUP: ['DRIVER_SEARCHING', 'CANCELLED', 'FAILED'],
  DRIVER_SEARCHING: ['DRIVER_ASSIGNED', 'CANCELLED', 'FAILED'],
  DRIVER_ASSIGNED: ['DRIVER_ACCEPTED', 'DRIVER_SEARCHING', 'CANCELLED', 'FAILED'],
  DRIVER_ACCEPTED: ['PICKED_UP', 'CANCELLED', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['ARRIVED', 'FAILED'],
  ARRIVED: ['DELIVERED', 'FAILED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [], CANCELLED: [], FAILED: [],
};

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!transitions[from]?.includes(to)) throw new BadRequestException(`Transição inválida: ${from} → ${to}.`);
}
