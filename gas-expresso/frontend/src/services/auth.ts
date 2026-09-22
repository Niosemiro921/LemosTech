export type AccountRole = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER';
export type AccountStatus = 'ACTIVE' | 'PENDING_REVIEW';

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: AccountRole;
  status: AccountStatus;
}

const KEY = 'gas-expresso-session';
const ROLE_PATH: Record<AccountRole, string> = {
  CUSTOMER: '/perfil',
  DRIVER: '/driver',
  SUPPLIER: '/supplier',
};

export function saveSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as SessionUser : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function rolePath(role: AccountRole) {
  return ROLE_PATH[role];
}

export function createDemoUser(input: Omit<SessionUser, 'id'>): SessionUser {
  return {
    id: `USR-${Date.now()}`,
    ...input,
  };
}
