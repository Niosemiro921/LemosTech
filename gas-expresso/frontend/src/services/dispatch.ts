import { apiPost } from '../lib/api';

export type DispatchStage = 'searching_supplier' | 'reserving_stock' | 'searching_driver' | 'driver_assigned' | 'pickup' | 'on_route' | 'arrived' | 'delivered';
export interface DispatchSnapshot { orderId: string; stage: DispatchStage; title: string; description: string; progress: number; driver: unknown | null; supplierName: string | null; updatedAt: string; }

/** Dispatch is server-owned. No client-side simulation is allowed. */
export async function startDispatch(orderId: string) {
  return apiPost(`/dispatch/orders/${encodeURIComponent(orderId)}/start`);
}
