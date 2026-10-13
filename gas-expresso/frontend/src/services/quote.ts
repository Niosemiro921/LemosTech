import { apiPost } from '../lib/api';
import type { DeliveryType, GasProduct, OrderKind } from '../types/gas';

export type BackendDeliveryType = 'EXPRESS' | 'SCHEDULED';

export interface QuoteRequestItem {
  variantId: string;
  quantity: number;
}

export interface QuoteAvailableResponse {
  available: true;
  supplier: { id: string; tradeName: string };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    discount: number;
    cylinderFee: number;
    total: number;
    currency: 'AOA';
    distanceKm: number;
    estimatedMinutes: [number, number] | number;
    pricingVersion: string;
  };
  payment: 'PAY_ON_DELIVERY';
}

export interface QuoteUnavailableResponse {
  available: false;
  message: string;
}

export type QuoteResponse = QuoteAvailableResponse | QuoteUnavailableResponse;

export interface QuotePricingView {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  /** Cilindros novos incluídos (0 na troca e na recarga). */
  cylinderFee: number;
  total: number;
  currency: 'AOA';
  distanceKm: number | null;
  estimatedMinutes: [number, number] | null;
  priceVersion: string;
  available: boolean;
  supplier?: { id: string; tradeName: string };
  message?: string;
}

function toBackendDeliveryType(type: DeliveryType): BackendDeliveryType {
  return type === 'express' ? 'EXPRESS' : 'SCHEDULED';
}

function normalizeEstimatedMinutes(
  value: QuoteAvailableResponse['pricing']['estimatedMinutes'],
): [number, number] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as [number, number];
  if (typeof value === 'number') {
    const delta = Math.max(5, Math.round(value * 0.3));
    return [Math.max(1, value - delta), value + delta];
  }
  return null;
}

export async function createQuote(params: {
  product: GasProduct;
  quantity: number;
  deliveryType: DeliveryType;
  latitude: number;
  longitude: number;
  deliveryAddress: string;
  scheduledAt?: string | null;
  bottleExchangeType?: OrderKind;
}): Promise<QuotePricingView> {
  const items: QuoteRequestItem[] = [{ variantId: params.product.id, quantity: params.quantity }];
  const payload = {
    items,
    deliveryType: toBackendDeliveryType(params.deliveryType),
    deliveryAddress: params.deliveryAddress,
    latitude: params.latitude,
    longitude: params.longitude,
    bottleExchangeType: params.bottleExchangeType ?? 'REFILL_EXCHANGE',
    ...(params.scheduledAt ? { scheduledAt: params.scheduledAt } : {}),
  };
  const response = await apiPost<QuoteResponse>('/orders/quote', payload, { requireAuth: false });
  if (!response.available) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      platformFee: 0,
      discount: 0,
      cylinderFee: 0,
      total: 0,
      currency: 'AOA',
      distanceKm: null,
      estimatedMinutes: null,
      priceVersion: 'unavailable',
      available: false,
      message: response.message,
    };
  }
  return {
    subtotal: response.pricing.subtotal,
    deliveryFee: response.pricing.deliveryFee,
    platformFee: response.pricing.platformFee,
    discount: response.pricing.discount ?? 0,
    cylinderFee: response.pricing.cylinderFee ?? 0,
    total: response.pricing.total,
    currency: response.pricing.currency ?? 'AOA',
    distanceKm: response.pricing.distanceKm,
    estimatedMinutes: normalizeEstimatedMinutes(response.pricing.estimatedMinutes),
    priceVersion: response.pricing.pricingVersion,
    available: true,
    supplier: response.supplier,
  };
}
