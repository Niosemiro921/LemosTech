import { apiPost } from '../lib/api';
import type { DeliveryType, GasProduct } from '../types/gas';

export interface CustomerOrder {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
}

export async function createCustomerOrder(input: {
  product: GasProduct;
  quantity: number;
  deliveryType: DeliveryType;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  scheduledAt: string | null;
  idempotencyKey: string;
}): Promise<CustomerOrder> {
  return apiPost<CustomerOrder>(
    '/orders',
    {
      items: [{ variantId: input.product.id, quantity: input.quantity }],
      deliveryType: input.deliveryType === 'express' ? 'EXPRESS' : 'SCHEDULED',
      deliveryAddress: input.deliveryAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      acceptEstimatedPrice: true,
    },
    { headers: { 'Idempotency-Key': input.idempotencyKey } },
  );
}
