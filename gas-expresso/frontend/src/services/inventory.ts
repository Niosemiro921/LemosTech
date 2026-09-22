import type { GasProduct } from '../types/gas';

export type StockStatus = 'available' | 'low' | 'unavailable';

export interface SupplierStock {
  supplierId: string;
  supplierName: string;
  area: string;
  lat: number;
  lng: number;
  stock: Record<GasProduct['size'], number>;
  verified: boolean;
  etaMinutes: [number, number];
}

export interface InventoryAvailability {
  available: boolean;
  status: StockStatus;
  requested: number;
  availableUnits: number;
  supplier: SupplierStock | null;
  message: string;
}

// Mock operacional para a V1 do frontend. A API substituirá esta fonte depois.
const supplierNetwork: SupplierStock[] = [
  {
    supplierId: 'sup-luanda-01',
    supplierName: 'Parceiro Gás Expresso · Luanda Sul',
    area: 'Talatona / Camama',
    lat: -8.9155,
    lng: 13.1792,
    stock: { '6kg': 42, '12kg': 68, '45kg': 9 },
    verified: true,
    etaMinutes: [20, 35],
  },
  {
    supplierId: 'sup-luanda-02',
    supplierName: 'Parceiro Gás Expresso · Viana',
    area: 'Viana / Kilamba',
    lat: -8.9027,
    lng: 13.3718,
    stock: { '6kg': 18, '12kg': 11, '45kg': 4 },
    verified: true,
    etaMinutes: [25, 45],
  },
  {
    supplierId: 'sup-luanda-03',
    supplierName: 'Parceiro Gás Expresso · Centro',
    area: 'Maianga / Ingombota',
    lat: -8.8276,
    lng: 13.2459,
    stock: { '6kg': 5, '12kg': 7, '45kg': 0 },
    verified: true,
    etaMinutes: [20, 40],
  },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const earthRadius = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function resolveInventoryAvailability(params: {
  lat: number | null;
  lng: number | null;
  product: GasProduct;
  quantity: number;
}): InventoryAvailability {
  if (params.lat == null || params.lng == null) {
    return {
      available: false,
      status: 'unavailable',
      requested: params.quantity,
      availableUnits: 0,
      supplier: null,
      message: 'Defina o ponto de entrega para verificarmos o stock disponível.',
    };
  }

  const candidates = supplierNetwork
    .map((supplier) => ({ supplier, distance: distanceKm({ lat: params.lat!, lng: params.lng! }, supplier) }))
    .filter(({ supplier }) => supplier.stock[params.product.size] > 0)
    .sort((a, b) => {
      const aStock = a.supplier.stock[params.product.size];
      const bStock = b.supplier.stock[params.product.size];
      const aCanFulfill = aStock >= params.quantity ? 0 : 1;
      const bCanFulfill = bStock >= params.quantity ? 0 : 1;
      return aCanFulfill - bCanFulfill || a.distance - b.distance;
    });

  const match = candidates[0];
  if (!match) {
    return {
      available: false,
      status: 'unavailable',
      requested: params.quantity,
      availableUnits: 0,
      supplier: null,
      message: `Não há stock disponível para ${params.product.label} na rede ativa desta área.`,
    };
  }

  const availableUnits = match.supplier.stock[params.product.size];
  const canFulfill = availableUnits >= params.quantity;
  const status: StockStatus = canFulfill && availableUnits > 5 ? 'available' : canFulfill ? 'low' : 'unavailable';

  if (!canFulfill) {
    return {
      available: false,
      status,
      requested: params.quantity,
      availableUnits,
      supplier: match.supplier,
      message: `Encontrámos apenas ${availableUnits} unidade(s) próximas. Reduza a quantidade para continuar.`,
    };
  }

  return {
    available: true,
    status,
    requested: params.quantity,
    availableUnits,
    supplier: match.supplier,
    message: status === 'low' ? 'Stock disponível, mas limitado.' : 'Stock confirmado com um parceiro verificado.',
  };
}
