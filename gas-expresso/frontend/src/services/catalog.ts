import type { GasProduct } from '../types/gas';

export const gasProducts: GasProduct[] = [
  { id: 'gas-6', size: '6kg', label: 'Botija 6 KG', price: 4500, description: 'Ideal para uso doméstico leve.' },
  { id: 'gas-12', size: '12kg', label: 'Botija 12 KG', price: 7200, description: 'A escolha mais popular para famílias.', popular: true },
  { id: 'gas-45', size: '45kg', label: 'Botija 45 KG', price: 26500, description: 'Para restaurantes e uso profissional.' },
];

export const formatAOA = (value: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(value);
