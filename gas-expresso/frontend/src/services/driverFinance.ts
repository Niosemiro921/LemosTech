import { apiGet, apiPost } from '../lib/api';
export interface DriverWallet { currency:'AOA'|string; balance:number; reservedBalance:number; availableBalance:number; minimumOperatingBalance:number; priorityScore:number; priorityBand:string; updatedAt:string; }
export interface WalletTransaction { id:string; type:string; amount:number; balanceAfter:number; description:string; reference?:string|null; createdAt:string; status?:string; }
export interface Earning { id:string; reference:string; gross:number; platformFee:number; net:number; status:string; createdAt:string; }
export interface PriorityPolicy { bands:Array<{code:string;label:string;minBalance:number;description:string}>; factors:Array<{code:string;label:string;weight:number;description:string}>; continuityEnabled:boolean; }
export interface TopUpRequest { id:string; amount:number; status:string; reference?:string|null; instructions?:string; currency:string; createdAt:string; }
export interface DriverWithdrawalRequest { id:string; amount:number; fee:number; cashAmount:number; method:string; account:string; status:string; reference?:string|null; currency:string; createdAt:string; }
export const fetchDriverWallet=()=>apiGet<DriverWallet>('/drivers/me/wallet');
export const fetchWalletTransactions=()=>apiGet<WalletTransaction[]>('/drivers/me/wallet/transactions');
export const fetchDriverEarnings=()=>apiGet<Earning[]>('/drivers/me/wallet/earnings');
export const fetchPriorityPolicy=()=>apiGet<PriorityPolicy>('/drivers/me/wallet/priority-policy');
export const requestWalletTopUp=(amount:number)=>apiPost<TopUpRequest>('/drivers/me/wallet/top-ups',{amount});
export const requestDriverWithdrawal=(input:{amount:number;method:string;account:string})=>apiPost<DriverWithdrawalRequest>('/drivers/me/wallet/withdrawals',input);
export const fetchDriverWithdrawals=()=>apiGet<DriverWithdrawalRequest[]>('/drivers/me/wallet/withdrawals');
export const isDriverWithdrawalConfigured=()=>true;
export const isDriverWithdrawalHistoryConfigured=()=>true;
