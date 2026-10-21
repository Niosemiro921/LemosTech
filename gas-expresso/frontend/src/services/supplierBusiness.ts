import { apiGet, apiPost, apiPatch } from '../lib/api';
export interface SupplierDashboard { orders:number; sales:number; lowStock:number; activeLots:number; customers:number; inventoryUnits:number; pendingInvoices:number; currency:'AOA'|string; }
export interface SupplierLot { id:string; code:string; productionAt:string; quantity:number; status:string; notes?:string|null; }
export interface SupplierInvoice { id:string; number:string; type:string; status:string; amount:number; issueDate:string; dueDate?:string|null; paidAt?:string|null; description?:string|null; }
export interface SupplierCustomer { customerId:string; name:string; phone?:string|null; email?:string|null; totalOrders:number; totalSpent:number; lastOrderAt?:string|null; currency:string; }
export interface SupplierInteraction { id:string; customerId:string; type:string; subject:string; message:string; nextActionAt?:string|null; createdAt:string; customer?:{ customer:{fullName:string}|null; phone?:string; } }
export const fetchSupplierDashboard=()=>apiGet<SupplierDashboard>('/suppliers/me/dashboard');
export const fetchSupplierLots=()=>apiGet<SupplierLot[]>('/suppliers/me/lots');
export const createSupplierLot=(input:{code:string;productionAt:string;quantity:number;status?:string;notes?:string})=>apiPost<SupplierLot>('/suppliers/me/lots',input);
export const updateSupplierLot=(id:string,input:Partial<SupplierLot>)=>apiPatch<SupplierLot>(`/suppliers/me/lots/${encodeURIComponent(id)}`,input);
export const fetchSupplierInvoices=()=>apiGet<SupplierInvoice[]>('/suppliers/me/invoices');
export const createSupplierInvoice=(input: {number:string;type:'SALE'|'PURCHASE';amount:number;issueDate:string;dueDate?:string;status?:string;description?:string})=>apiPost<SupplierInvoice>('/suppliers/me/invoices',input);
export const fetchSupplierCustomers=()=>apiGet<SupplierCustomer[]>('/suppliers/me/customers');
export const fetchSupplierInteractions=(customerId?:string)=>apiGet<SupplierInteraction[]>('/suppliers/me/interactions',customerId?{customerId}:undefined);
export const createSupplierInteraction=(input:{customerId:string;type:'NOTE'|'CALL'|'FOLLOW_UP';subject:string;message:string;nextActionAt?:string})=>apiPost<SupplierInteraction>('/suppliers/me/interactions',input);
export const fetchSupplierSegmentation=()=>apiGet<SupplierCustomer[]>('/suppliers/me/segmentation');
export const fetchSupplierReports=()=>apiGet<{currency:string;totalOrders:number;completedOrders:number;grossSales:number;deliveryFees:number;monthlySales:Array<{month:string;amount:number}>}>('/suppliers/me/reports');
