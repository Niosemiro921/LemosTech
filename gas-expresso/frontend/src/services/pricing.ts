import type { DeliveryType, GasProduct } from "../types/gas";

export interface PricingQuote {
  currency: "AOA";
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
  distanceKm: number | null;
  estimatedMinutes: [number, number] | null;
  priceVersion: string;
}

// Regras temporárias de UX. O backend será a fonte oficial destes valores.
const PRICING_VERSION = "frontend-v1-demo";
const EXPRESS_SURCHARGE = 400;
const BASE_DELIVERY_FEE = 600;
const INCLUDED_DISTANCE_KM = 5;
const EXTRA_KM_FEE = 100;
const PLATFORM_FEE = 800;

function roundMoney(value: number) {
  return Math.max(0, Math.round(value));
}

function distanceFee(distanceKm: number | null) {
  if (distanceKm == null) return BASE_DELIVERY_FEE;
  const extraKm = Math.max(0, Math.ceil(distanceKm - INCLUDED_DISTANCE_KM));
  return BASE_DELIVERY_FEE + extraKm * EXTRA_KM_FEE;
}

export function calculateQuote(params: {
  product: GasProduct;
  quantity: number;
  deliveryType: DeliveryType;
  distanceKm: number | null;
  etaMinutes?: [number, number] | null;
}): PricingQuote {
  const subtotal = roundMoney(params.product.price * params.quantity);
  const deliveryFee = roundMoney(
    distanceFee(params.distanceKm) + (params.deliveryType === "express" ? EXPRESS_SURCHARGE : 0),
  );
  const platformFee = PLATFORM_FEE;
  const discount = 0;
  const total = roundMoney(subtotal + deliveryFee + platformFee - discount);

  return {
    currency: "AOA",
    subtotal,
    deliveryFee,
    platformFee,
    discount,
    total,
    distanceKm: params.distanceKm,
    estimatedMinutes: params.etaMinutes ?? null,
    priceVersion: PRICING_VERSION,
  };
}
