import { create } from 'zustand';
import type { DeliveryAddress, DeliveryType, GasProduct } from '../types/gas';

interface OrderState {
  selectedProduct: GasProduct | null;
  quantity: number;
  address: DeliveryAddress | null;
  deliveryType: DeliveryType;
  scheduledAt: string | null;
  setProduct: (product: GasProduct) => void;
  setQuantity: (quantity: number) => void;
  setAddress: (address: DeliveryAddress) => void;
  setDeliveryType: (type: DeliveryType) => void;
  setScheduledAt: (value: string | null) => void;
  clear: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  selectedProduct: null,
  quantity: 1,
  address: null,
  deliveryType: 'express',
  scheduledAt: null,
  setProduct: (selectedProduct) => set({ selectedProduct }),
  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(20, quantity)) }),
  setAddress: (address) => set({ address }),
  setDeliveryType: (deliveryType) => set({ deliveryType, scheduledAt: deliveryType === 'express' ? null : null }),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
  clear: () => set({ selectedProduct: null, quantity: 1, address: null, deliveryType: 'express', scheduledAt: null }),
}));
