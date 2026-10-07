import { apiGet } from '../lib/api';
export interface SupplierStock { supplierId: string; supplierName: string; availableQty: number; reservedQty: number; }
export interface InventoryResult { supplier: SupplierStock | null; }
export function fetchInventoryForLocation(latitude: number, longitude: number) { return apiGet<InventoryResult>('/inventory/availability', { latitude, longitude }); }
