import { apiGet, apiPatch, apiPost, ApiError } from '../lib/api';

export type AccountRole = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'DOCUMENTS_REQUIRED' | 'REJECTED' | 'SUSPENDED';

export interface SessionUser {
  id: string;
  name?: string;
  phone: string;
  email?: string | null;
  role: AccountRole;
  status: AccountStatus;
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
  createdAt: string;
}

export type RegisterResult = { message: string; user: SessionUser };
const SESSION_KEY = 'gas-expresso-session';
const ROLE_PATH: Record<AccountRole, string> = {
  CUSTOMER: '/perfil',
  DRIVER: '/driver',
  SUPPLIER: '/fornecedor',
  ADMIN: '/admin',
};

export function rolePath(role: AccountRole) {
  return ROLE_PATH[role] ?? '/acesso';
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session?.accessToken && session.user ? session : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): SessionUser | null {
  return getSession()?.user ?? null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return !!getSession()?.accessToken;
}

export function extractMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function login(input: { phone: string; password: string }): Promise<Session> {
  const response = await apiPost<{ accessToken: string; user: SessionUser }>(
    '/auth/login',
    { phone: input.phone.trim(), password: input.password },
    { requireAuth: false },
  );
  const session: Session = {
    accessToken: response.accessToken,
    user: response.user,
    createdAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export async function fetchMe(): Promise<SessionUser | null> {
  if (!isAuthenticated()) return null;
  const user = await apiGet<SessionUser>('/auth/me');
  const session = getSession();
  if (session) saveSession({ ...session, user });
  return user;
}

export async function updateCustomerProfile(input: { fullName: string; email: string | null }) {
  const user = await apiPatch<SessionUser>('/auth/me', {
    fullName: input.fullName.trim(),
    email: input.email?.trim() || null,
  });
  const session = getSession();
  if (session) saveSession({ ...session, user });
  return user;
}

export async function registerCustomer(input: { fullName: string; phone: string; email?: string; password: string }) {
  return apiPost<RegisterResult>('/auth/register/customer', input, { requireAuth: false });
}

export async function registerDriver(input: { fullName: string; phone: string; email?: string; password: string; documentNumber: string; vehicleType: string }) {
  return apiPost<RegisterResult>('/auth/register/driver', input, { requireAuth: false });
}

export async function registerSupplier(input: { legalName: string; tradeName: string; nif: string; responsibleName: string; phone: string; email?: string; password: string }) {
  return apiPost<RegisterResult>('/auth/register/supplier', input, { requireAuth: false });
}

/**
 * The existing frontend contract did not expose a server-side logout endpoint.
 * When the backend publishes one, set VITE_AUTH_LOGOUT_PATH; otherwise we still
 * terminate the browser session immediately and invalidate the bearer token locally.
 */
export async function logout() {
  const logoutPath = (import.meta.env.VITE_AUTH_LOGOUT_PATH as string | undefined)?.trim();
  try {
    if (logoutPath) await apiPost(logoutPath);
  } finally {
    clearSession();
  }
}
