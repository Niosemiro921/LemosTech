import { apiGet } from '../lib/api';

export interface TrackingOrder {
  id: string;
  reference: string;
  status: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
  createdAt: string;
}
export interface LiveDriver {
  id?: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  latitude: number | null;
  longitude: number | null;
  ratingAverage: number;
  lastLocationAt?: string | null;
}
export interface LiveTrackingResponse {
  order: TrackingOrder;
  delivery: null | { status: string; driver: LiveDriver; estimatedMinutes?: number | null; distanceKm?: number | null };
}
export const fetchLiveTracking = (orderId: string) => apiGet<LiveTrackingResponse>(`/orders/mine/${encodeURIComponent(orderId)}/tracking`);

export function openTrackingSocket(orderId: string, onMessage: (tracking: LiveTrackingResponse) => void, onState: (state: 'connected' | 'disconnected' | 'error') => void) {
  const raw = (import.meta.env.VITE_REALTIME_URL as string | undefined)?.trim();
  if (!raw || typeof WebSocket === 'undefined') return () => undefined;
  const url = `${raw.replace(/\/$/, '')}/orders/${encodeURIComponent(orderId)}`;
  let socket: WebSocket | null = null;
  try {
    socket = new WebSocket(url);
    socket.onopen = () => onState('connected');
    socket.onclose = () => onState('disconnected');
    socket.onerror = () => onState('error');
    socket.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data) as LiveTrackingResponse); } catch { /* ignore malformed events */ }
    };
  } catch { onState('error'); }
  return () => { try { socket?.close(); } catch { /* noop */ } };
}
