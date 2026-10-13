export type GasSize = '6kg' | '12kg' | '45kg';
export type DeliveryType = 'express' | 'scheduled';

/**
 * Tipo de atendimento do pedido:
 * - REFILL_EXCHANGE: troca a botija vazia pela cheia (paga só o gás).
 * - NEW_CYLINDER: compra de um cilindro novo + gás.
 * - REFILL: recarga da botija que já tem, sem troca.
 */
export type OrderKind = 'REFILL_EXCHANGE' | 'NEW_CYLINDER' | 'REFILL';

/** Aceita também o valor legado 'NEW_BOTTLE', usado antes da separação dos fluxos. */
export function normalizeOrderKind(value?: string | null): OrderKind {
  if (value === 'REFILL_EXCHANGE' || value === 'NEW_CYLINDER' || value === 'REFILL') return value;
  if (value === 'NEW_BOTTLE') return 'NEW_CYLINDER';
  return 'REFILL_EXCHANGE';
}

export interface GasProduct {
  id: string;
  size: GasSize;
  label: string;
  price: number;
  /** Preço do cilindro novo (hardware). Na troca e na recarga não é cobrado. */
  cylinderPrice: number;
  description: string;
}

export interface DeliveryAddress {
  label: string;
  address: string;
  reference?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
}
