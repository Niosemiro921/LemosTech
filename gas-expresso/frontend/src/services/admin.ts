import { apiGet, apiPost } from '../lib/api';
export interface AdminOverview { customers:number; companies:number; drivers:number; prestadores:number; activeOrders:number; completedOrders:number; revenue:number; incidentsOpen:number; pendingApplications:number; expiringDocuments:number; walletTopUpsPending:number; walletWithdrawalsPending:number; usersByStatus:Record<string,number>; usersByRole:Record<string,number>; }
export interface AdminPartner { id:string; name:string; type:'DRIVER'|'PRESTADOR'|'SUPPLIER'|string; status:string; phone?:string; createdAt?:string; verification?:string; balance?:number; }
export interface AdminOrder { id:string; reference:string; status:string; customer?:string; supplier?:string; driver?:string|null; total?:number; createdAt:string; }
export interface DispatchItem { orderId:string; reference:string; status:string; pickup?:{latitude:number|null;longitude:number|null;address:string}; dropoff?:{latitude:number|null;longitude:number|null;address:string}; recommendedDriver?:{id:string;name:string;priorityScore:number;priorityBand:string;balance:number;availableBalance:number;distanceKm:number;continuity:boolean}|null; }
export interface AdminApplication { id:string; phone:string; email?:string|null; role:'DRIVER'|'PRESTADOR'|'SUPPLIER'|string; status:string; createdAt:string; reviewedAt?:string|null; reviewNote?:string|null; profile:{fullName?:string;documentNumber?:string;vehicleType?:string;legalName?:string;tradeName?:string;nif?:string;responsibleName?:string} }
export interface AuditEntry { id:string; actor:string; action:string; entity:string; entityId:string; summary:string; createdAt:string; }
export const fetchAdminOverview=()=>apiGet<AdminOverview>('/admin/overview');
export const fetchAdminPartners=(type?:string)=>apiGet<AdminPartner[]>('/admin/partners',type?{type}:undefined);
export const updateAdminPartnerStatus=(id:string,action:'approve'|'reject'|'suspend'|'reactivate',reason?:string)=>apiPost(`/admin/partners/${encodeURIComponent(id)}/${action}`,reason?{reason}:{});
export const fetchAdminOrders=()=>apiGet<AdminOrder[]>('/admin/orders');
export const fetchDispatchQueue=()=>apiGet<DispatchItem[]>('/admin/dispatch/queue');
export const retryDispatch=(orderId:string)=>apiPost(`/admin/dispatch/orders/${encodeURIComponent(orderId)}/retry`);
export const fetchAdminApplications=(role?:string,status?:string)=>apiGet<AdminApplication[]>('/admin/applications',{...(role?{role}:{}),...(status?{status}:{})});
export const decideAdminApplication=(userId:string,action:'approve'|'reject'|'request-documents',reason?:string)=>apiPost(`/admin/applications/${encodeURIComponent(userId)}/${action}`,reason?{reason}:{});
export const fetchAuditLog=()=>apiGet<AuditEntry[]>('/admin/audit');
export const sendAdminEmail=(input:{to?:string;userId?:string;subject:string;message:string})=>apiPost<{sent:boolean;to:string;subject:string}>('/admin/email',input);
