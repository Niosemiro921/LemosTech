import { apiPost } from '../lib/api';

export type AnalyticsEventType = 'PAGE_VIEW' | 'CLICK';
export type AnalyticsArea = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER' | 'ADMIN' | 'PUBLIC';

interface AnalyticsEventInput {
  eventType: AnalyticsEventType;
  area: AnalyticsArea;
  path: string;
  target?: string;
}

/**
 * Regista apenas o tipo de evento, a área, o caminho sem query string e um rótulo
 * de interface. Nunca envia conteúdo de campos, palavras-passe, telefone ou endereço.
 * A falha de analytics nunca deve bloquear a jornada do utilizador.
 */
function newAnalyticsSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.random() * 16 | 0; return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16); });
}

function analyticsSessionId(): string {
  const key = 'gas-expresso-analytics-session';
  try {
    const current = sessionStorage.getItem(key);
    if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;
    const generated = newAnalyticsSessionId();
    sessionStorage.setItem(key, generated);
    return generated;
  } catch {
    return newAnalyticsSessionId();
  }
}

export async function trackAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  await apiPost('/analytics/events', {
    sessionId: analyticsSessionId(),
    eventType: input.eventType,
    area: input.area,
    path: input.path.slice(0, 255),
    ...(input.target ? { target: input.target.slice(0, 100) } : {}),
  }, { requireAuth: false, timeoutMs: 3500 });
}

export function analyticsAreaForPath(pathname: string): AnalyticsArea {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'ADMIN';
  if (pathname.startsWith('/fornecedor') || pathname.startsWith('/supplier') || pathname.startsWith('/empresa')) return 'SUPPLIER';
  if (pathname.startsWith('/driver') || pathname.startsWith('/fornecedor')) return 'DRIVER';
  if (['/pedir', '/confirmar', '/pagamento', '/rastrear', '/perfil', '/enderecos', '/notificacoes', '/suporte'].some((path) => pathname === path || pathname.startsWith(`${path}/`)) || pathname.startsWith('/chat/pedido/')) return 'CUSTOMER';
  return 'PUBLIC';
}

/** Reduz rotas com identificadores a um modelo, evitando guardar IDs de recursos. */
export function analyticsPathTemplate(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const safe = parts.map((part, index) => {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part) || /^\d{5,}$/.test(part)) return ':id';
    if (['pedido', 'order', 'tracking'].includes(parts[index - 1]?.toLowerCase() ?? '') && part.length > 8) return ':id';
    return part.slice(0, 60);
  });
  return `/${safe.join('/')}`.slice(0, 255) || '/';
}
