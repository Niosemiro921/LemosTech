import type { PricingQuote } from './pricing';

export type PaymentMethod = 'multicaixa' | 'transfer' | 'cash_on_delivery';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';

export interface PaymentIntent {
  id: string;
  orderReference: string;
  amount: number;
  currency: 'AOA';
  method: PaymentMethod;
  status: PaymentStatus;
  commission: number;
  createdAt: string;
}

const methodLabels: Record<PaymentMethod, string> = {
  multicaixa: 'Multicaixa Express',
  transfer: 'Transferência bancária',
  cash_on_delivery: 'Pagamento na entrega',
};

export function getPaymentMethodLabel(method: PaymentMethod) {
  return methodLabels[method];
}

export function createMockPaymentIntent(input: {
  quote: PricingQuote;
  method: PaymentMethod;
}): PaymentIntent {
  return {
    id: `PI-${crypto.randomUUID()}`,
    orderReference: `GE-${Date.now().toString().slice(-8)}`,
    amount: input.quote.total,
    currency: 'AOA',
    method: input.method,
    status: input.method === 'cash_on_delivery' ? 'pending' : 'processing',
    commission: input.quote.platformFee,
    createdAt: new Date().toISOString(),
  };
}
