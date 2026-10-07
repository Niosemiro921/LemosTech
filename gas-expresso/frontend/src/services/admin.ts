import { apiGet, apiPost } from '../lib/api';

export interface AdminOverview {
  customers: number;
  companies: number;
  drivers: number;
  activeOrders: number;
  completedOrders: number;
  incidentsOpen: number;
  pendingApplications: number;
  expiringDocuments: number;
  revenue?: number;
}
export interface AdminPartner {
  id: string;
  name: string;
  type: 'DRIVER' | 'SUPPLIER' | string;
  status: string;
  phone?: string;
  createdAt?: string;
  verification?: string;
  balance?: number;
}
export interface AdminOrder {
  id: string;
  reference: string;
  status: string;
  customer?: string;
  supplier?: string;
  driver?: string | null;
  total?: number;
  createdAt: string;
}
export interface DispatchItem {
  orderId: string;
  reference: string;
  status: string;
  pickup?: { latitude: number | null; longitude: number | null; address: string };
  dropoff?: { latitude: number | null; longitude: number | null; address: string };
  recommendedDriver?: { id: string; name: string; priorityScore: number; balance: number; distanceKm: number } | null;
}
export interface AuditEntry { id: string; actor: string; action: string; entity: string; entityId: string; summary: string; createdAt: string; }
export const fetchAdminOverview = () => apiGet<AdminOverview>('/admin/overview');
export const fetchAdminPartners = (type?: string) => apiGet<AdminPartner[]>('/admin/partners', type ? { type } : undefined);
export const updateAdminPartnerStatus = (id: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate', reason?: string) =>
  apiPost(`/admin/partners/${encodeURIComponent(id)}/${action}`, reason ? { reason } : undefined);
export const fetchAdminOrders = () => apiGet<AdminOrder[]>('/admin/orders');
export const fetchDispatchQueue = () => apiGet<DispatchItem[]>('/admin/dispatch/queue');
export const retryDispatch = (orderId: string) => apiPost(`/admin/dispatch/orders/${encodeURIComponent(orderId)}/retry`);
export const fetchAuditLog = () => apiGet<AuditEntry[]>('/admin/audit');
