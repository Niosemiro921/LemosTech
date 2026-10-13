import type { GasProduct } from '../types/gas';
import { apiGet } from '../lib/api';

interface ApiProduct {
  name: string;
  description?: string | null;
  variants: Array<{ id: string; name: string; weightKg: number; unitPrice: number; cylinderPrice?: number | null }>;
}

export async function fetchGasProducts(): Promise<GasProduct[]> {
  const products = await apiGet<ApiProduct[]>('/products', undefined, { requireAuth: false });
  return products.flatMap((product) => product.variants.map((variant) => ({
    id: variant.id,
    size: `${variant.weightKg}kg` as GasProduct['size'],
    label: variant.name,
    price: variant.unitPrice,
    cylinderPrice: variant.cylinderPrice ?? 0,
    description: product.description || product.name,
  })));
}

export const formatAOA = (value: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(value);
