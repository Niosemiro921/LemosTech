export type GasSize = '6kg' | '12kg' | '45kg';
export type DeliveryType = 'express' | 'scheduled';

export interface GasProduct {
  id: string;
  size: GasSize;
  label: string;
  price: number;
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
