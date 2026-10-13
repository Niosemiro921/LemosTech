import { apiGet, apiPost } from '../lib/api';

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  isBot?: boolean;
}

export interface CallSessionInfo {
  id: string;
  orderId: string;
  callerId: string;
  receiverId: string;
  status: 'OFFERING' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'REJECTED' | 'MISSED';
  sdpOffer?: string;
  sdpAnswer?: string;
  createdAt: string;
}

export interface OrderChat {
  threadId: string;
  orderId: string;
  customerId: string;
  professionalId: string;
  customerPhone?: string | null;
  driverPhone?: string | null;
  messages: ChatMessage[];
  activeCall?: CallSessionInfo | null;
}

export const fetchOrderChat = (orderId: string) =>
  apiGet<OrderChat>(`/chat/orders/${encodeURIComponent(orderId)}`);

export const sendOrderChatMessage = (orderId: string, message: string) =>
  apiPost<ChatMessage>(`/chat/orders/${encodeURIComponent(orderId)}/messages`, { message });

export const markOrderChatRead = (orderId: string) =>
  apiPost(`/chat/orders/${encodeURIComponent(orderId)}/read`);

// --- In-App Voice Call Signaling ---
export const initiateCallOffer = (orderId: string, sdpOffer: string) =>
  apiPost<{ callId: string; orderId: string; sdpOffer: string; status: string }>(
    `/chat/orders/${encodeURIComponent(orderId)}/call/offer`,
    { sdpOffer },
  );

export const answerCallOffer = (orderId: string, sdpAnswer: string) =>
  apiPost<{ callId: string; orderId: string; sdpAnswer: string; status: string }>(
    `/chat/orders/${encodeURIComponent(orderId)}/call/answer`,
    { sdpAnswer },
  );

export const sendCallIceCandidate = (orderId: string, candidate: unknown) =>
  apiPost<{ received: boolean }>(`/chat/orders/${encodeURIComponent(orderId)}/call/ice-candidate`, {
    candidate,
  });

export const endActiveCall = (orderId: string, reason?: string) =>
  apiPost<{ ended: boolean; status: string }>(`/chat/orders/${encodeURIComponent(orderId)}/call/end`, {
    reason,
  });

export const getActiveCallSession = (orderId: string) =>
  apiGet<CallSessionInfo | null>(`/chat/orders/${encodeURIComponent(orderId)}/call/session`);
