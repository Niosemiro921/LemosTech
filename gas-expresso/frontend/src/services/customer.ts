import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';

export interface CustomerAddress {
  id: string;
  label: string;
  address: string;
  reference?: string | null;
  municipality?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastMessage?: string | null;
}

export const fetchCustomerAddresses = () => apiGet<CustomerAddress[]>('/customers/me/addresses');
export const createCustomerAddress = (input: Omit<CustomerAddress, 'id' | 'isDefault'> & { isDefault?: boolean }) => apiPost<CustomerAddress>('/customers/me/addresses', input);
export const updateCustomerAddress = (id: string, input: Partial<Omit<CustomerAddress, 'id'>>) => apiPatch<CustomerAddress>(`/customers/me/addresses/${encodeURIComponent(id)}`, input);
export const deleteCustomerAddress = (id: string) => apiDelete(`/customers/me/addresses/${encodeURIComponent(id)}`);

export const fetchNotifications = () => apiGet<NotificationItem[]>('/notifications');
export const markNotificationRead = (id: string) => apiPost(`/notifications/${encodeURIComponent(id)}/read`);
export const markAllNotificationsRead = () => apiPost('/notifications/read-all');

export const fetchSupportTickets = () => apiGet<SupportTicket[]>('/support/tickets');
export const createSupportTicket = (input: { subject: string; message: string; category: string }) => apiPost<SupportTicket>('/support/tickets', input);
