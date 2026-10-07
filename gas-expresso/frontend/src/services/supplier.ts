import { apiGet, apiPatch, apiPost } from '../lib/api';

export interface SupplierOrder {
  id: string;
  reference: string;
  status: string;
  deliveryAddress: string;
  createdAt: string;
  pricing: { subtotal: number; total: number; currency: string };
  items: Array<{ variantName: string; quantity: number; unitPrice: number }>;
}
export interface SupplierInventoryItem {
  id: string;
  variantId: string;
  availableQty: number;
  reservedQty: number;
  reorderLevel: number;
  variant: { name: string; weightKg: number; unitPrice: number; sku: string };
}
export interface SupplierLocation { latitude: number | null; longitude: number | null }

export const fetchSupplierOrders = () => apiGet<SupplierOrder[]>('/suppliers/me/orders');
export const fetchSupplierInventory = () => apiGet<SupplierInventoryItem[]>('/suppliers/me/inventory');
export const fetchSupplierLocation = () => apiGet<SupplierLocation>('/suppliers/me/location');
export const updateSupplierInventory = (variantId: string, availableQty: number, reorderLevel: number) =>
  apiPatch('/suppliers/me/inventory', { variantId, availableQty, reorderLevel });
export const updateSupplierLocation = (latitude: number, longitude: number) =>
  apiPatch<SupplierLocation>('/suppliers/me/location', { latitude, longitude });
export const acceptSupplierOrder = (id: string) => apiPost(`/suppliers/me/orders/${encodeURIComponent(id)}/accept`);
export const prepareSupplierOrder = (id: string) => apiPost(`/suppliers/me/orders/${encodeURIComponent(id)}/prepare`);
export const readySupplierOrder = (id: string) => apiPost(`/suppliers/me/orders/${encodeURIComponent(id)}/ready`);
export const startDispatch = (id: string) => apiPost(`/dispatch/orders/${encodeURIComponent(id)}/start`, {});
