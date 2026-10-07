import { ApiError, apiGet, apiPost } from '../lib/api';

export interface DriverWallet {
  currency: 'AOA' | string;
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  minimumOperatingBalance: number;
  priorityScore: number;
  priorityBand: string;
  updatedAt?: string;
}
export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter?: number;
  description: string;
  status: string;
  createdAt: string;
  reference?: string | null;
}
export interface WalletTopUpRequest {
  id: string;
  amount: number;
  status: string;
  reference?: string | null;
  instructions?: string | null;
  createdAt: string;
}
export interface DriverWithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  cashAmount?: number;
  fee?: number;
  createdAt: string;
  reference?: string | null;
}
export interface PriorityPolicy {
  bands: Array<{ code: string; label: string; minBalance: number; description: string }>;
  factors: Array<{ code: string; label: string; weight: number; description: string }>;
  continuityEnabled: boolean;
}

const readEnv = (value: string | undefined) => value?.trim();

export const fetchDriverWallet = () => apiGet<DriverWallet>('/drivers/me/wallet');
export const fetchWalletTransactions = () => apiGet<WalletTransaction[]>('/drivers/me/wallet/transactions');
export const requestWalletTopUp = (amount: number) => apiPost<WalletTopUpRequest>('/drivers/me/wallet/top-ups', { amount });
export const fetchPriorityPolicy = () => apiGet<PriorityPolicy>('/drivers/me/wallet/priority-policy');

export function isDriverWithdrawalConfigured() {
  return Boolean(readEnv(import.meta.env.VITE_DRIVER_WITHDRAWAL_PATH));
}

export function isDriverWithdrawalHistoryConfigured() {
  return Boolean(readEnv(import.meta.env.VITE_DRIVER_WITHDRAWALS_PATH));
}

export const fetchDriverWithdrawals = () => {
  const path = readEnv(import.meta.env.VITE_DRIVER_WITHDRAWALS_PATH);
  if (!path) throw new ApiError(0, 'O endpoint de histórico de levantamentos ainda não está configurado neste frontend.');
  return apiGet<DriverWithdrawalRequest[]>(path);
};

export async function requestDriverWithdrawal(input: { amount: number; method: string; account: string }) {
  const path = readEnv(import.meta.env.VITE_DRIVER_WITHDRAWAL_PATH);
  if (!path) throw new ApiError(0, 'O endpoint de levantamento do entregador ainda não está configurado neste frontend.');
  return apiPost<DriverWithdrawalRequest>(path, input);
}
