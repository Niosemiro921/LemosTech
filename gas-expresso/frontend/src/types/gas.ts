export type GasSize = '6kg' | '12kg' | '45kg';
export type DeliveryType = 'express' | 'scheduled';

/** Preferência de veículo solicitada pelo cliente; a elegibilidade final é validada no backend. */
export type RequestedVehicleType = 'MOTORCYCLE' | 'CAR' | 'CUPAPATA';

export const REQUESTED_VEHICLE_OPTIONS: Array<{ value: RequestedVehicleType; label: string; description: string; icon: string }> = [
  { value: 'MOTORCYCLE', label: 'Motorizada', description: 'Ideal para pedidos pequenos e ruas estreitas.', icon: '🛵' },
  { value: 'CAR', label: 'Carro', description: 'Mais espaço para várias botijas e volumes médios.', icon: '🚗' },
  { value: 'CUPAPATA', label: 'Cupapata', description: 'Transporte de carga; depende de parceiro disponível na zona.', icon: '🛺' },
];

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
  popular?: boolean;
}

export interface DeliveryAddress {
  label: string;
  address: string;
  reference?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
}
