import { apiGet, apiPost, apiPatch } from '../lib/api';

export interface SupplierDashboard {
  currency: 'AOA' | string;
  generatedAt: string;
  orders: number;
  sales: number;
  inventoryUnits: number;
  lowStock: number;
  pendingInvoices: number;
  customers: number;
  activeLots: number;
  kpis: {
    salesToday: number;
    salesWeek: number;
    salesMonth: number;
    totalSales: number;
    ordersReceived: number;
    ordersPending: number;
    ordersPreparing: number;
    ordersInDelivery: number;
    ordersDelivered: number;
    ordersCancelled: number;
    revenueReceived: number;
    amountsToReceive: number;
    amountsToReceiveValue: number;
    expenses: number;
    grossMarginEstimated: number;
    grossMarginEstimatedAvailable: boolean;
    bottlesAvailable: number;
    bottlesReserved: number;
    bottlesDelivered: number;
    bottlesEmpty: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    pendingPurchases: number;
    delayedDeliveries: number;
    employeePerformance: Array<Record<string, unknown>>;
  };
  salesSeries: Array<{ date: string; sales: number; orders: number }>;
  salesByMonth: Array<{ month: string; amount: number }>;
  ordersByStatus: Array<{ status: string; count: number; total: number }>;
  expensesVsRevenue: Array<{ period: string; revenue: number; expenses: number }>;
  periodComparison: { current: number; previous: number; growth: number };
}

export interface SupplierLot {
  id: string;
  code: string;
  productionAt: string;
  quantity: number;
  status: string;
  notes?: string | null;
}

export interface SupplierInvoice {
  id: string;
  number: string;
  type: string;
  status: string;
  amount: number;
  issueDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
  description?: string | null;
}

export interface SupplierCustomer {
  customerId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  currency: string;
}

export interface SupplierInteraction {
  id: string;
  customerId: string;
  type: string;
  subject: string;
  message: string;
  nextActionAt?: string | null;
  createdAt: string;
  customer?: { customer: { fullName: string } | null; phone?: string };
}

export const fetchSupplierDashboard = () => apiGet<SupplierDashboard>('/suppliers/me/dashboard');
export const fetchSupplierLots = () => apiGet<SupplierLot[]>('/suppliers/me/lots');
export const createSupplierLot = (input: { code: string; productionAt: string; quantity: number; status?: string; notes?: string }) =>
  apiPost<SupplierLot>('/suppliers/me/lots', input);
export const updateSupplierLot = (id: string, input: Partial<SupplierLot>) =>
  apiPatch<SupplierLot>(`/suppliers/me/lots/${encodeURIComponent(id)}`, input);
export const fetchSupplierInvoices = () => apiGet<SupplierInvoice[]>('/suppliers/me/invoices');
export const createSupplierInvoice = (input: {
  number: string;
  type: 'SALE' | 'PURCHASE';
  amount: number;
  issueDate: string;
  dueDate?: string;
  status?: string;
  description?: string;
}) => apiPost<SupplierInvoice>('/suppliers/me/invoices', input);
export const fetchSupplierCustomers = () => apiGet<SupplierCustomer[]>('/suppliers/me/customers');
export const fetchSupplierInteractions = (customerId?: string) =>
  apiGet<SupplierInteraction[]>('/suppliers/me/interactions', customerId ? { customerId } : undefined);
export const createSupplierInteraction = (input: {
  customerId: string;
  type: 'NOTE' | 'CALL' | 'FOLLOW_UP';
  subject: string;
  message: string;
  nextActionAt?: string;
}) => apiPost<SupplierInteraction>('/suppliers/me/interactions', input);
export const fetchSupplierSegmentation = () => apiGet<SupplierCustomer[]>('/suppliers/me/segmentation');
export const fetchSupplierReports = () =>
  apiGet<{ currency: string; totalOrders: number; completedOrders: number; grossSales: number; deliveryFees: number; monthlySales: Array<{ month: string; amount: number }> }>(
    '/suppliers/me/reports',
  );export interface SupplierFinanceItem {
  id: string;
  reference: string;
  amount: number;
  date: string;
  status: string;
  description?: string | null;
}
export interface SupplierFinanceSummary {
  currency: string;
  items: SupplierFinanceItem[];
  total: number;
}
export const fetchSupplierPayments = () => apiGet<SupplierFinanceSummary>('/suppliers/me/payments');
export const fetchSupplierExpenses = () => apiGet<SupplierFinanceSummary>('/suppliers/me/expenses');
