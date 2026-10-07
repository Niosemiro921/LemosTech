const DEFAULT_TIMEOUT_MS = 20000;
const SESSION_KEY = 'gas-expresso-session';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export type ApiErrorShape = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

export class ApiError extends Error {
  status: number;
  raw: ApiErrorShape | null;

  constructor(status: number, message: string, raw: ApiErrorShape | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.raw = raw;
  }
}

function readSession(): { accessToken?: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { accessToken?: string }) : null;
  } catch {
    return null;
  }
}

function clearSessionAndRedirect() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/acesso') && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/acesso');
  }
}

function getBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window === 'undefined') return 'http://localhost:5048/api/v1';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5048/api/v1`;
}

function buildUrl(path: string): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (/^https?:\/\//.test(cleanPath)) return cleanPath;
  const withPrefix = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  return `${withPrefix}${cleanPath}`;
}

function buildHeaders(customHeaders?: Record<string, string> | HeadersInit, requireAuth = true): Record<string, string> {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (requireAuth) {
    const session = readSession();
    if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  }
  if (customHeaders && typeof customHeaders === 'object' && !Array.isArray(customHeaders)) {
    for (const [k, v] of Object.entries(customHeaders as Record<string, string>)) {
      if (v === undefined || v === null) continue;
      headers[k] = v;
    }
  }
  return headers;
}

function extractMessage(payload: ApiErrorShape | unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as ApiErrorShape;
    if (Array.isArray(p.message) && p.message.length > 0) return p.message.join(' ');
    if (typeof p.message === 'string' && p.message.length > 0) return p.message;
  }
  return fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => '');
  let data: T | ApiErrorShape | null = null;
  try {
    data = text ? (JSON.parse(text) as T | ApiErrorShape) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const fallback = `Erro ${response.status} ${response.statusText}`.trim();
    const message = extractMessage(data, fallback);
    if (response.status === 401) clearSessionAndRedirect();
    throw new ApiError(response.status, message, (data && typeof data === 'object' && 'statusCode' in data) ? (data as ApiErrorShape) : null);
  }

  return (data as T) ?? (undefined as unknown as T);
}

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  requireAuth?: boolean;
  timeoutMs?: number;
};

export async function request<T = unknown>(options: RequestOptions): Promise<T> {
  const { method, path, body, headers, query, requireAuth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  let finalPath = path;
  if (query) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      search.append(k, String(v));
    }
    const qs = search.toString();
    if (qs) finalPath = `${finalPath}${finalPath.includes('?') ? '&' : '?'}${qs}`;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const init: RequestInit = { method, headers: buildHeaders(headers, requireAuth), signal: controller.signal };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      init.body = body;
      const built = init.headers as Record<string, string>;
      delete built['Content-Type'];
    } else {
      init.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(buildUrl(finalPath), init);
    return await parseResponse<T>(response);
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'A operação demorou demasiado tempo. Verifique a sua ligação e tente novamente.');
    }
    const msg = error instanceof Error ? error.message : 'Erro de rede';
    throw new ApiError(0, `Não foi possível ligar ao servidor. ${msg}`);
  } finally {
    window.clearTimeout(timer);
  }
}

export function apiGet<T = unknown>(path: string, query?: RequestOptions['query'], options: Omit<RequestOptions, 'method' | 'path' | 'query'> = {}) {
  return request<T>({ method: 'GET', path, query, ...options });
}
export function apiPost<T = unknown>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'path' | 'body'> = {}) {
  return request<T>({ method: 'POST', path, body, ...options });
}
export function apiPut<T = unknown>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'path' | 'body'> = {}) {
  return request<T>({ method: 'PUT', path, body, ...options });
}
export function apiPatch<T = unknown>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'path' | 'body'> = {}) {
  return request<T>({ method: 'PATCH', path, body, ...options });
}
export function apiDelete<T = unknown>(path: string, options: Omit<RequestOptions, 'method' | 'path'> = {}) {
  return request<T>({ method: 'DELETE', path, ...options });
}

export const api = { get: apiGet, post: apiPost, put: apiPut, patch: apiPatch, delete: apiDelete, request };
export default api;
