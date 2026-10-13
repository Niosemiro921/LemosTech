import type { OrderKind } from '../types/gas';

export interface OrderKindMeta {
  /** Valor enviado ao servidor. */
  value: OrderKind;
  /** Título curto (cartões e resumos). */
  label: string;
  /** Ícone do cartão. */
  icon: string;
  /** Subtítulo dentro do cartão de escolha. */
  tagline: string;
  /** Explicação detalhada no cartão de escolha. */
  description: string;
  /** Título da página do pedido. */
  heading: string;
  /** Subtítulo da página do pedido. */
  subheading: string;
  /** Nota apresentada no resumo/confirmção. */
  note: string;
}

export const ORDER_KIND_META: Record<OrderKind, OrderKindMeta> = {
  REFILL_EXCHANGE: {
    value: 'REFILL_EXCHANGE',
    label: 'Trocar botija',
    icon: '🔁',
    tagline: 'Entrega a cheia, leva a vazia',
    description: 'Recebemos a sua botija vazia e entregamos uma cheia do mesmo tamanho. Paga apenas o gás.',
    heading: 'Troque a sua botija.',
    subheading: 'Entregamos a botija cheia e recolhemos a vazia — na troca você paga só o gás.',
    note: 'Na entrega, entregue a botija vazia do mesmo tamanho ao entregador.',
  },
  NEW_CYLINDER: {
    value: 'NEW_CYLINDER',
    label: 'Comprar botija nova',
    icon: '🆕',
    tagline: 'Cilindro novo + gás',
    description: 'Botija nova de fábrica, entregue pronta a usar. O valor do cilindro é somado ao do gás.',
    heading: 'Compre a sua botija.',
    subheading: 'Cilindro novo entregue com gás, pronto a usar — o cilindro é somado ao total.',
    note: 'O pedido inclui um cilindro novo, cobrado à parte no resumo.',
  },
  REFILL: {
    value: 'REFILL',
    label: 'Só recarregar',
    icon: '⛽',
    tagline: 'Encher a botija que já tem',
    description: 'O entregador recarrega a botija que já está em casa, sem recolha nem troca de vasilhame.',
    heading: 'Peça o seu gás.',
    subheading: 'A botija que já tem é recarregada no local — sem troca de vasilhame.',
    note: 'A botija mantém-se em casa; o entregador apenas a recarrega.',
  },
};

export const ORDER_KIND_LIST: OrderKindMeta[] = [
  ORDER_KIND_META.REFILL_EXCHANGE,
  ORDER_KIND_META.NEW_CYLINDER,
  ORDER_KIND_META.REFILL,
];

/** Converte o parâmetro da URL (`/pedir?tipo=...`) no tipo de pedido. */
export function orderKindFromParam(param?: string | null): OrderKind | null {
  switch (param) {
    case 'troca':
      return 'REFILL_EXCHANGE';
    case 'compra':
      return 'NEW_CYLINDER';
    case 'gas':
      return 'REFILL';
    default:
      return null;
  }
}

/** Converte o tipo de pedido no parâmetro da URL. */
export function orderKindToParam(kind: OrderKind): string {
  switch (kind) {
    case 'REFILL_EXCHANGE':
      return 'troca';
    case 'NEW_CYLINDER':
      return 'compra';
    case 'REFILL':
      return 'gas';
  }
}
