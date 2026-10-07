import { ApiError, apiGet, apiPost } from '../lib/api';

export interface AdminTopUpRequest {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  status: string;
  reference?: string | null;
  createdAt: string;
}

const readEnv = (value: string | undefined) => value?.trim();
const TOP_UPS_PATH = '/admin/wallet/top-ups';
const CONFIRM_PATH = '/admin/wallet/top-ups/:id/confirm';
const REJECT_PATH = '/admin/wallet/top-ups/:id/reject';

function configuredPath(key: string, fallback: string) {
  return readEnv(key === 'VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE'
    ? import.meta.env.VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE
    : key === 'VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE'
      ? import.meta.env.VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE
      : import.meta.env.VITE_ADMIN_WALLET_TOPUPS_PATH) || fallback;
}

export function isAdminTopUpWorkflowConfigured() {
  return Boolean(configuredPath('VITE_ADMIN_WALLET_TOPUPS_PATH', TOP_UPS_PATH)
    && configuredPath('VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE', CONFIRM_PATH)
    && configuredPath('VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE', REJECT_PATH));
}

function pathOrThrow() {
  const path = configuredPath('VITE_ADMIN_WALLET_TOPUPS_PATH', TOP_UPS_PATH);
  if (!path) throw new ApiError(0, 'O endpoint administrativo de solicitações de recarga ainda não está configurado neste frontend.');
  return path;
}

function resolveTemplate(key: string, id: string) {
  const template = configuredPath(
    key,
    key === 'VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE' ? CONFIRM_PATH : REJECT_PATH,
  );
  if (!template) throw new ApiError(0, `O endpoint ${key} ainda não está configurado neste frontend.`);
  return template.replaceAll(':id', encodeURIComponent(id)).replaceAll('{id}', encodeURIComponent(id));
}

export const fetchAdminTopUps = () => apiGet<AdminTopUpRequest[]>(pathOrThrow());
export const confirmAdminTopUp = (id: string) => apiPost(resolveTemplate('VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE', id), {});
export const rejectAdminTopUp = (id: string, reason: string) =>
  apiPost(resolveTemplate('VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE', id), { reason });
