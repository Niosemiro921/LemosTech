import { apiGet, apiPatch, apiPost } from '../lib/api';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionInvoiceStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'PAID' | 'REJECTED' | 'CANCELLED';

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxBranches: number | null;
  maxUsers: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySubscription {
  id: string;
  supplierId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
  canOperate: boolean;
  plan: BillingPlan;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  supplierId: string;
  subscriptionId: string | null;
  planId: string;
  number: string;
  amount: number;
  billingCycle: BillingCycle;
  status: SubscriptionInvoiceStatus;
  periodStart: string;
  periodEnd: string;
  proofUrl: string | null;
  proofNote: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  plan: BillingPlan;
}

export interface BillingOverview {
  supplier: { id: string; name: string };
  subscription: CompanySubscription;
  plans: BillingPlan[];
  invoices: SubscriptionInvoice[];
  paymentInstructions: { bank: string; iban: string; accountName: string; note: string };
}

interface AdminSupplierSummary {
  id: string;
  tradeName: string;
  legalName: string;
  nif: string;
  userId: string;
  user: { phone: string; email: string | null };
}

export interface AdminSubscriptionInvoice extends SubscriptionInvoice {
  supplier: AdminSupplierSummary;
}

export interface AdminSubscription extends CompanySubscription {
  supplier: AdminSupplierSummary;
}

export const fetchBillingOverview = () => apiGet<BillingOverview>('/billing/overview');

export const createSubscriptionInvoice = (planId: string, billingCycle: BillingCycle) =>
  apiPost<SubscriptionInvoice>('/billing/invoices', { planId, billingCycle });

export const submitSubscriptionProof = (invoiceId: string, proofUrl: string, proofNote?: string) =>
  apiPost<SubscriptionInvoice>(`/billing/invoices/${encodeURIComponent(invoiceId)}/proof`, { proofUrl, ...(proofNote ? { proofNote } : {}) });

export const fetchAdminBillingInvoices = (status?: SubscriptionInvoiceStatus) =>
  apiGet<AdminSubscriptionInvoice[]>('/admin/billing/invoices', status ? { status } : undefined);

export const confirmAdminBillingInvoice = (id: string) =>
  apiPost<SubscriptionInvoice>(`/admin/billing/invoices/${encodeURIComponent(id)}/confirm`, {});

export const rejectAdminBillingInvoice = (id: string, reason: string) =>
  apiPost<SubscriptionInvoice>(`/admin/billing/invoices/${encodeURIComponent(id)}/reject`, { reason });

export const fetchAdminSubscriptions = () => apiGet<AdminSubscription[]>('/admin/billing/subscriptions');

export const updateAdminSubscriptionStatus = (supplierId: string, action: 'suspend' | 'reactivate', reason?: string) =>
  apiPost<CompanySubscription>(`/admin/billing/subscriptions/${encodeURIComponent(supplierId)}/${action}`, reason ? { reason } : {});

export const fetchAdminBillingPlans = () => apiGet<BillingPlan[]>('/admin/billing/plans');

export const updateAdminBillingPlan = (id: string, input: Partial<Pick<BillingPlan, 'name' | 'description' | 'priceMonthly' | 'priceYearly' | 'maxBranches' | 'maxUsers' | 'active'>>) =>
  apiPatch<BillingPlan>(`/admin/billing/plans/${encodeURIComponent(id)}`, input);
