import { apiPost } from '../lib/api';
import { normalizeOrderKind, type DeliveryType, type GasProduct, type OrderKind } from '../types/gas';

export interface CustomerOrder {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  changeForAmount?: number | null;
  bottleExchangeType?: string | null;
  bottleBrand?: string | null;
  valveType?: string | null;
  deliveryNotes?: string | null;
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
  changeForAmount?: number | null;
  bottleExchangeType?: OrderKind;
  bottleBrand?: string;
  valveType?: string;
  deliveryNotes?: string;
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
      ...(input.changeForAmount ? { changeForAmount: input.changeForAmount } : {}),
      bottleExchangeType: normalizeOrderKind(input.bottleExchangeType),
      bottleBrand: input.bottleBrand ?? 'Sonangol',
      valveType: input.valveType ?? 'QUICK_20MM',
      ...(input.deliveryNotes ? { deliveryNotes: input.deliveryNotes } : {}),
      acceptEstimatedPrice: true,
    },
    { headers: { 'Idempotency-Key': input.idempotencyKey } },
  );
}
