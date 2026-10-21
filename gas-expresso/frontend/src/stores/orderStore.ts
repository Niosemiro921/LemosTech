import { create } from 'zustand';
import { normalizeOrderKind, type DeliveryAddress, type DeliveryType, type GasProduct, type OrderKind, type RequestedVehicleType } from '../types/gas';

interface OrderState {
  selectedProduct: GasProduct | null;
  quantity: number;
  address: DeliveryAddress | null;
  deliveryType: DeliveryType;
  requestedVehicleType: RequestedVehicleType;
  scheduledAt: string | null;
  changeForAmount: number | null;
  bottleExchangeType: OrderKind;
  bottleBrand: string;
  valveType: string;
  deliveryNotes: string;
  setProduct: (product: GasProduct) => void;
  setQuantity: (quantity: number) => void;
  setAddress: (address: DeliveryAddress) => void;
  setDeliveryType: (type: DeliveryType) => void;
  setRequestedVehicleType: (type: RequestedVehicleType) => void;
  setScheduledAt: (value: string | null) => void;
  setChangeForAmount: (value: number | null) => void;
  setBottleExchangeType: (value: OrderKind) => void;
  setBottleBrand: (brand: string) => void;
  setValveType: (valve: string) => void;
  setDeliveryNotes: (notes: string) => void;
  clear: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  selectedProduct: null,
  quantity: 1,
  address: null,
  deliveryType: 'express',
  requestedVehicleType: 'MOTORCYCLE',
  scheduledAt: null,
  changeForAmount: null,
  bottleExchangeType: 'REFILL_EXCHANGE',
  bottleBrand: 'Sonangol',
  valveType: 'QUICK_20MM',
  deliveryNotes: '',
  setProduct: (selectedProduct) => set({ selectedProduct }),
  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(20, quantity)) }),
  setAddress: (address) => set({ address }),
  setDeliveryType: (deliveryType) => set({ deliveryType, scheduledAt: null }),
  setRequestedVehicleType: (requestedVehicleType) => set({ requestedVehicleType }),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
  setChangeForAmount: (changeForAmount) => set({ changeForAmount }),
  setBottleExchangeType: (value) => set({ bottleExchangeType: normalizeOrderKind(value) }),
  setBottleBrand: (bottleBrand) => set({ bottleBrand }),
  setValveType: (valveType) => set({ valveType }),
  setDeliveryNotes: (deliveryNotes) => set({ deliveryNotes }),
  clear: () =>
    set({
      selectedProduct: null,
      quantity: 1,
      address: null,
      deliveryType: 'express',
      requestedVehicleType: 'MOTORCYCLE',
      scheduledAt: null,
      changeForAmount: null,
      bottleExchangeType: 'REFILL_EXCHANGE',
      bottleBrand: 'Sonangol',
      valveType: 'QUICK_20MM',
      deliveryNotes: '',
    }),
}));
