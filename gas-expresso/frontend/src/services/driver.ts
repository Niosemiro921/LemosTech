import { apiGet, apiPost } from '../lib/api';

export interface DriverProfile {
  id: string;
  fullName: string;
  vehicleType: string;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  ratingAverage: number;
  completedDeliveries: number;
}

export interface DriverOrder {
  id: string;
  reference: string;
  status: string;
  deliveryAddress: string;
  paymentMethod: string;
  items: Array<{ variantName: string; quantity: number; weightKg: number }>;
  pricing: { subtotal?: number; deliveryFee?: number; platformFee?: number; discount?: number; total: number; currency: string; distanceKm?: number; estimatedMinutes?: number };
  supplier: { tradeName: string; latitude: number | null; longitude: number | null } | null;
}

export interface DriverDelivery {
  id: string;
  status: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff: { address: string; latitude: number; longitude: number };
  order: DriverOrder;
}

export interface DriverOffer {
  id: string;
  expiresAt: string;
  distanceToPickupKm: number;
  estimatedPickupMinutes: number;
  order: DriverOrder;
}

export interface DriverEarning {
  id: string;
  reference: string;
  gross: number;
  platformFee: number;
  net: number;
  status: string;
  createdAt: string;
}

export const fetchDriverProfile = () => apiGet<DriverProfile>('/drivers/me');
export const fetchDriverOffers = () => apiGet<DriverOffer[]>('/drivers/me/offers');
export const fetchCurrentDelivery = () => apiGet<DriverDelivery | null>('/drivers/me/deliveries/current');
export const fetchDriverDelivery = (id: string) => apiGet<DriverDelivery>(`/drivers/me/deliveries/${encodeURIComponent(id)}`);
export const fetchDriverEarnings = () => apiGet<DriverEarning[]>('/drivers/me/wallet/earnings');
export const setDriverOnline = (latitude: number, longitude: number) => apiPost('/drivers/me/online', { latitude, longitude });
export const setDriverOffline = () => apiPost('/drivers/me/offline');
export const updateDriverLocation = (latitude: number, longitude: number) => apiPost('/drivers/me/location', { latitude, longitude });
export const acceptDriverOffer = (id: string) => apiPost<{ deliveryId: string }>(`/drivers/me/offers/${encodeURIComponent(id)}/accept`);
export const rejectDriverOffer = (id: string) => apiPost(`/drivers/me/offers/${encodeURIComponent(id)}/reject`);

const actions: Record<string, string> = {
  ASSIGNED: 'to-pickup',
  TO_PICKUP: 'at-pickup',
  AT_PICKUP: 'picked-up',
  PICKED_UP: 'in-transit',
  IN_TRANSIT: 'arrived',
  ARRIVED: 'delivered',
};

export function advanceDriverDelivery(deliveryId: string, status: string, location?: { latitude: number; longitude: number }) {
  const action = actions[status];
  if (!action) throw new Error(`Não existe ação disponível para o estado ${status}.`);
  return apiPost(`/drivers/me/deliveries/${encodeURIComponent(deliveryId)}/${action}`, location ?? {});
}
