import { getSession } from './auth';

function baseRealtimeUrl() {
  const configured = (import.meta.env.VITE_REALTIME_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || `${window.location.protocol}//${window.location.hostname}:5048/api/v1`;
  return apiBase.replace(/\/api\/v1\/?$/, '');
}

export interface RealtimeHandlers {
  onLocation?: (payload: unknown) => void;
  onChatMessage?: (payload: unknown) => void;
  onCallOffer?: (payload: unknown) => void;
  onCallAnswer?: (payload: unknown) => void;
  onCallIceCandidate?: (payload: unknown) => void;
  onCallEnded?: (payload: unknown) => void;
  onState?: (state: 'connected' | 'disconnected' | 'error') => void;
}

export function openOrderRealtime(orderId: string, handlers: RealtimeHandlers) {
  const token = getSession()?.accessToken;
  if (!token) return () => undefined;
  const controller = new AbortController();
  let cancelled = false;
  let buffer = '';

  async function run() {
    try {
      const response = await fetch(`${baseRealtimeUrl()}/api/v1/realtime/orders/${encodeURIComponent(orderId)}/stream`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        handlers.onState?.('error');
        return;
      }
      handlers.onState?.('connected');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\n\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
          const data = frame.match(/^data:\s*(.+)$/m)?.[1];
          if (!data) continue;
          let payload: unknown;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === 'driver:location') handlers.onLocation?.(payload);
          if (event === 'chat:message') handlers.onChatMessage?.(payload);
          if (event === 'call:offer') handlers.onCallOffer?.(payload);
          if (event === 'call:answer') handlers.onCallAnswer?.(payload);
          if (event === 'call:ice-candidate') handlers.onCallIceCandidate?.(payload);
          if (event === 'call:ended') handlers.onCallEnded?.(payload);
        }
      }
      if (!cancelled) handlers.onState?.('disconnected');
    } catch (error) {
      if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
        handlers.onState?.('error');
      }
    }
  }

  void run();
  return () => {
    cancelled = true;
    controller.abort();
    handlers.onState?.('disconnected');
  };
}
