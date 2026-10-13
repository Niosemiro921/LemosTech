import { apiGet, apiPatch, apiPost, ApiError } from '../lib/api';

export type AccountRole = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER' | 'PRESTADOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'DOCUMENTS_REQUIRED' | 'REJECTED' | 'SUSPENDED';

export interface SessionUser { id: string; name?: string; phone: string; email?: string | null; role: AccountRole; status: AccountStatus; reviewedAt?: string | null; reviewNote?: string | null; }
export interface Session { accessToken: string; user: SessionUser; createdAt: string; }
export type RegisterResult = { message: string; user: SessionUser };
const SESSION_KEY = 'gas-expresso-session';
const ROLE_PATH: Record<AccountRole, string> = { CUSTOMER: '/perfil', DRIVER: '/driver', SUPPLIER: '/fornecedor', PRESTADOR: '/prestador', ADMIN: '/admin' };
export function rolePath(role: AccountRole) { return ROLE_PATH[role] ?? '/acesso'; }
export function saveSession(session: Session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function getSession(): Session | null { try { const raw = localStorage.getItem(SESSION_KEY); if (!raw) return null; const session = JSON.parse(raw) as Session; return session?.accessToken && session.user ? session : null; } catch { return null; } }
export function getCurrentUser() { return getSession()?.user ?? null; }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }
export function isAuthenticated() { return !!getSession()?.accessToken; }
export function extractMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.') { if (error instanceof ApiError && error.message) return error.message; if (error instanceof Error && error.message) return error.message; return fallback; }
export async function login(input: { phone: string; password: string; role?: AccountRole }): Promise<Session> {
  const response = await apiPost<{ accessToken: string; user: SessionUser }>('/auth/login', { phone: input.phone.trim(), password: input.password, ...(input.role ? { role: input.role } : {}) }, { requireAuth: false });
  const session: Session = { accessToken: response.accessToken, user: response.user, createdAt: new Date().toISOString() }; saveSession(session); return session;
}
export async function fetchMe() { if (!isAuthenticated()) return null; const user = await apiGet<SessionUser>('/auth/me'); const session = getSession(); if (session) saveSession({ ...session, user }); return user; }
export async function updateCustomerProfile(input: { fullName: string; email: string | null }) { const user = await apiPatch<SessionUser>('/auth/me', { fullName: input.fullName.trim(), email: input.email?.trim() || null }); const session = getSession(); if (session) saveSession({ ...session, user }); return user; }
export async function registerCustomer(input: { fullName: string; phone: string; email?: string; password: string }) { return apiPost<RegisterResult>('/auth/register/customer', input, { requireAuth: false }); }
export interface ProfessionalRegistration { fullName: string; phone: string; email?: string; password: string; documentNumber: string; vehicleType: string; vehiclePlate?: string; driverLicenseNumber?: string; nif?: string; experienceYears?: number; province?: string; municipality?: string; neighborhood?: string; address?: string; insurancePolicyNumber?: string; insuranceExpiresAt?: string; vehicleCapacityKg?: number; }
export async function registerDriver(input: ProfessionalRegistration) { return apiPost<RegisterResult>('/auth/register/driver', input, { requireAuth: false }); }
/** O backend actual não tem Role.PRESTADOR nem endpoint de registo para este perfil. Não chamar uma rota inexistente. */
export interface PrestadorRegistration { fullName: string; phone: string; email?: string; password: string; legalName: string; tradeName: string; nif: string; commercialRegistration?: string; activity?: string; province?: string; municipality?: string; neighborhood?: string; address?: string; }
export async function registerPrestador(_input: PrestadorRegistration): Promise<RegisterResult> {
  throw new Error('O cadastro de Prestador independente ainda não está disponível na API. Escolha Entregador ou Empresa/Fornecedor.');
}
export interface SupplierRegistration { legalName: string; tradeName: string; nif: string; responsibleName: string; phone: string; email?: string; password: string; commercialRegistration?: string; activity?: string; phoneAlt?: string; province?: string; municipality?: string; neighborhood?: string; address?: string; }
export async function registerSupplier(input: SupplierRegistration) { return apiPost<RegisterResult>('/auth/register/supplier', input, { requireAuth: false }); }
export async function logout() { const logoutPath = (import.meta.env.VITE_AUTH_LOGOUT_PATH as string | undefined)?.trim() || '/auth/logout'; try { if (logoutPath) await apiPost(logoutPath); } finally { clearSession(); } }
