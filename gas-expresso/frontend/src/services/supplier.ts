export type SupplierOrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'collected';

export type SupplierOrder = {
  id: string;
  productName: string;
  quantity: number;
  customerArea: string;
  distanceKm: number;
  total: number;
  supplierNet: number;
  status: SupplierOrderStatus;
  requestedAt: string;
};

export type InventoryItem = {
  sku: string;
  name: string;
  sizeKg: number;
  available: number;
  reserved: number;
  reorderPoint: number;
  unitPrice: number;
};

export const supplierOrders: SupplierOrder[] = [
  { id: 'GE-20481', productName: 'Botija 12 KG', quantity: 1, customerArea: 'Talatona', distanceKm: 5.4, total: 9300, supplierNet: 7000, status: 'new', requestedAt: 'Agora' },
  { id: 'GE-20477', productName: 'Botija 6 KG', quantity: 2, customerArea: 'Kilamba', distanceKm: 7.8, total: 11500, supplierNet: 8600, status: 'preparing', requestedAt: 'Há 6 min' },
  { id: 'GE-20462', productName: 'Botija 45 KG', quantity: 1, customerArea: 'Viana', distanceKm: 11.2, total: 24700, supplierNet: 19800, status: 'ready', requestedAt: 'Há 13 min' },
];

export const inventory: InventoryItem[] = [
  { sku: 'GAS-06', name: 'Botija 6 KG', sizeKg: 6, available: 34, reserved: 4, reorderPoint: 10, unitPrice: 4300 },
  { sku: 'GAS-12', name: 'Botija 12 KG', sizeKg: 12, available: 18, reserved: 6, reorderPoint: 8, unitPrice: 7000 },
  { sku: 'GAS-45', name: 'Botija 45 KG', sizeKg: 45, available: 7, reserved: 3, reorderPoint: 5, unitPrice: 19800 },
];

export const statusLabels: Record<SupplierOrderStatus, string> = {
  new: 'Novo',
  accepted: 'Aceite',
  preparing: 'A preparar',
  ready: 'Pronto para recolha',
  collected: 'Recolhido',
};
