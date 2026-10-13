import { apiGet, apiPost } from '../lib/api';
export interface AdminTopUpRequest { id:string; driverId:string; driverName:string; amount:number; status:string; reference?:string|null; currency?:string; createdAt:string; }
export interface AdminWithdrawalRequest { id:string; driverId:string; driverName:string; amount:number; fee:number; cashAmount:number; method:string; account:string; status:string; reference?:string|null; createdAt:string; requestedAt?:string; reviewNote?:string|null; }
export const fetchAdminTopUps=()=>apiGet<AdminTopUpRequest[]>('/admin/wallet/top-ups');
export const confirmAdminTopUp=(id:string,reason?:string)=>apiPost(`/admin/wallet/top-ups/${encodeURIComponent(id)}/confirm`,reason?{reason}:{});
export const rejectAdminTopUp=(id:string,reason:string)=>apiPost(`/admin/wallet/top-ups/${encodeURIComponent(id)}/reject`,{reason});
export const fetchAdminWithdrawals=()=>apiGet<AdminWithdrawalRequest[]>('/admin/wallet/withdrawals');
export const approveAdminWithdrawal=(id:string,reason?:string)=>apiPost(`/admin/wallet/withdrawals/${encodeURIComponent(id)}/approve`,reason?{reason}:{});
export const rejectAdminWithdrawal=(id:string,reason:string)=>apiPost(`/admin/wallet/withdrawals/${encodeURIComponent(id)}/reject`,{reason});
export const payAdminWithdrawal=(id:string,reason?:string)=>apiPost(`/admin/wallet/withdrawals/${encodeURIComponent(id)}/pay`,reason?{reason}:{});
