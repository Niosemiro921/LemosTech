import { apiGet } from '../lib/api';
import { openOrderRealtime } from './realtime';

export interface TrackingOrder { id: string; reference: string; status: string; deliveryAddress: string; latitude: number; longitude: number; updatedAt?: string; createdAt: string; }
export interface LiveDriver { id?: string; fullName: string; phone: string; vehicleType: string; latitude: number | null; longitude: number | null; ratingAverage: number; lastLocationAt?: string | null; }
export interface LiveTrackingResponse { order: TrackingOrder; delivery: null | { id?:string; status: string; driver: LiveDriver; estimatedMinutes?: number | null; distanceKm?: number | null; }; }
export const fetchLiveTracking = (orderId: string) => apiGet<LiveTrackingResponse>(`/orders/mine/${encodeURIComponent(orderId)}/tracking`);
export function openTrackingSocket(orderId: string, onMessage: (tracking: LiveTrackingResponse) => void, onState: (state: 'connected' | 'disconnected' | 'error') => void) {
  return openOrderRealtime(orderId, {
    onLocation: (payload) => {
      const point = payload as { latitude?: number; longitude?: number; lastLocationAt?: string };
      void fetchLiveTracking(orderId).then((data) => {
        if (data.delivery) {
          data.delivery.driver = { ...data.delivery.driver, latitude: point.latitude ?? data.delivery.driver.latitude, longitude: point.longitude ?? data.delivery.driver.longitude, lastLocationAt: point.lastLocationAt ?? new Date().toISOString() };
        }
        onMessage(data);
      }).catch(() => undefined);
    },
    onState,
  });
}
