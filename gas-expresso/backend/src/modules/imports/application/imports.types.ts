import { normalizePhone, parseDateValue, parseDecimal, parseInteger, pick, slugify } from './csv';

export const IMPORT_ENTITIES = ['products', 'customers', 'invoices'] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export function isImportEntity(value: string): value is ImportEntity {
  return (IMPORT_ENTITIES as readonly string[]).includes(value);
}

export interface ProductImportPayload {
  productSlug: string;
  productName: string;
  productDescription?: string;
  sku: string;
  variantName: string;
  weightKg: number;
  unitPrice: number;
  cylinderPrice: number;
  stockQty?: number;
  reorderLevel?: number;
}

export interface CustomerImportPayload {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  reference?: string;
  municipality?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
}

export interface InvoiceImportPayload {
  number: string;
  type: 'SALE' | 'PURCHASE';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  amount: number;
  issueDate: Date;
  dueDate?: Date;
  description?: string;
}

export type ImportPayload = ProductImportPayload | CustomerImportPayload | InvoiceImportPayload;

export interface NormalizedRow<T extends ImportPayload = ImportPayload> {
  payload?: T;
  action: 'create' | 'update' | 'skip';
  errors: string[];
  message?: string;
}

function text(value: string) {
  return value.trim();
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeProduct(values: Record<string, string>): NormalizedRow<ProductImportPayload> {
  const errors: string[] = [];
  const rawSku = text(pick(values, 'sku', 'codigoVariante', 'codigo', 'codigoProduto', 'referencia', 'ref', 'artigo', 'codArtigo')).toUpperCase();
  const variantName = text(
    pick(values, 'variantName', 'nomeVariante', 'nome', 'descricao', 'produtoVariante', 'descricaoVariante', 'designacao'),
  );
  const rawProductName = text(
    pick(values, 'productName', 'nomeProduto', 'produto', 'nomeDoProduto', 'familia', 'categoria'),
  );
  const productName = rawProductName || variantName;
  const rawSlug = text(pick(values, 'productSlug', 'slug', 'produtoSlug', 'codigoProduto'));
  const weightKg = parseInteger(pick(values, 'weightKg', 'pesoKg', 'peso', 'kg', 'pesoEmKg', 'capacidade', 'capacidadeKg', 'tamanho'));
  const unitPrice = parseInteger(pick(values, 'unitPrice', 'precoUnitario', 'preco', 'precoUnidade', 'valor', 'valorUnitario', 'precoKz', 'precoEmKz', 'pvp', 'precoVenda'));
  const cylinderPrice = parseInteger(pick(values, 'cylinderPrice', 'precoCilindro', 'cilindro', 'precoNovo', 'precoCilindroNovo', 'valorCilindro')) ?? 0;
  const stockQty = parseInteger(pick(values, 'stockQty', 'quantidade', 'qtd', 'stock', 'stockInicial', 'quantidadeEmStock', 'existencia', 'existencias', 'saldo'));
  const reorderLevel = parseInteger(pick(values, 'reorderLevel', 'stockMinimo', 'nivelReposicao', 'minimo', 'pontoReencomenda', 'stockMin'));

  if (!productName) errors.push('Nome do produto/variante obrigatório.');
  if (weightKg === null || weightKg < 1) errors.push('Peso (kg) deve ser um inteiro maior que zero.');
  if (unitPrice === null || unitPrice < 0) errors.push('Preço unitário inválido.');
  if (cylinderPrice < 0) errors.push('Preço do cilindro inválido.');
  if (stockQty !== null && stockQty < 0) errors.push('Quantidade de stock inválida.');
  if (reorderLevel !== null && reorderLevel < 0) errors.push('Stock mínimo inválido.');

  const slug = slugify(rawSlug || productName || `gas-${weightKg ?? 0}kg`);
  const sku = rawSku || `AUTO-${slug}-${weightKg ?? 0}KG`.toUpperCase();

  if (errors.length > 0) return { action: 'create', errors };
  return {
    action: 'create',
    errors: [],
    payload: {
      productSlug: slug,
      productName,
      productDescription: optionalText(pick(values, 'productDescription', 'descricaoProduto', 'descricaoDoProduto')),
      sku,
      variantName: variantName || productName,
      weightKg: weightKg as number,
      unitPrice: unitPrice as number,
      cylinderPrice,
      stockQty: stockQty === null ? undefined : stockQty,
      reorderLevel: reorderLevel === null ? undefined : reorderLevel,
    },
  };
}

export function normalizeCustomer(values: Record<string, string>): NormalizedRow<CustomerImportPayload> {
  const errors: string[] = [];
  const fullName = text(pick(values, 'fullName', 'nome', 'nomeCompleto', 'cliente', 'nomeCliente', 'designacao'));
  const phoneRaw = text(pick(values, 'phone', 'telefone', 'telemovel', 'celular', 'contacto', 'numero', 'telefone1', 'numeroTelefone', 'whatsapp'));
  const phone = normalizePhone(phoneRaw);
  const email = optionalText(pick(values, 'email', 'eMail', 'correio', 'correioEletronico', 'mail'));
  const latitudeRaw = pick(values, 'latitude', 'lat');
  const longitudeRaw = pick(values, 'longitude', 'lng', 'lon');
  const latitude = latitudeRaw ? parseDecimal(latitudeRaw) : undefined;
  const longitude = longitudeRaw ? parseDecimal(longitudeRaw) : undefined;

  if (!fullName) errors.push('Nome obrigatório.');
  if (!phone) errors.push('Telefone obrigatório.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email inválido.');
  if (latitudeRaw && (latitude == null || latitude < -90 || latitude > 90)) errors.push('Latitude inválida.');
  if (longitudeRaw && (longitude == null || longitude < -180 || longitude > 180)) errors.push('Longitude inválida.');

  if (errors.length > 0) return { action: 'create', errors };
  return {
    action: 'create',
    errors: [],
    payload: {
      fullName,
      phone,
      email,
      address: optionalText(pick(values, 'address', 'endereco', 'morada', 'rua')),
      reference: optionalText(pick(values, 'reference', 'referencia', 'pontoReferencia', 'bairro')),
      municipality: optionalText(pick(values, 'municipality', 'municipio', 'cidade')),
      province: optionalText(pick(values, 'province', 'provincia', 'estado')),
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    },
  };
}

export function normalizeInvoice(values: Record<string, string>): NormalizedRow<InvoiceImportPayload> {
  const errors: string[] = [];
  const number = text(pick(values, 'number', 'numero', 'numeroFatura', 'nrFatura', 'fatura', 'documento', 'numeroDocumento'));
  const typeRaw = text(pick(values, 'type', 'tipo', 'tipoDocumento')).toUpperCase();
  const statusRaw = text(pick(values, 'status', 'estado', 'situacao')).toUpperCase();
  const amount = parseInteger(pick(values, 'amount', 'valor', 'montante', 'total', 'quantia', 'valorTotal'));
  const issueDateRaw = text(pick(values, 'issueDate', 'dataEmissao', 'data', 'dataDocumento'));
  const dueDateRaw = text(pick(values, 'dueDate', 'dataVencimento', 'vencimento'));
  const issueDate = parseDateValue(issueDateRaw);
  const dueDate = dueDateRaw ? parseDateValue(dueDateRaw) : undefined;

  const typeMap: Record<string, 'SALE' | 'PURCHASE'> = {
    SALE: 'SALE',
    VENDA: 'SALE',
    PURCHASE: 'PURCHASE',
    COMPRA: 'PURCHASE',
  };
  const statusMap: Record<string, 'PENDING' | 'PAID' | 'CANCELLED'> = {
    PENDING: 'PENDING',
    PENDENTE: 'PENDING',
    PAID: 'PAID',
    PAGO: 'PAID',
    PAGA: 'PAID',
    CANCELLED: 'CANCELLED',
    CANCELADA: 'CANCELLED',
    CANCELADO: 'CANCELLED',
  };
  const type = typeMap[typeRaw];
  const status = statusRaw ? statusMap[statusRaw] : 'PENDING';

  if (!number) errors.push('Número da fatura obrigatório.');
  if (!type) errors.push('Tipo deve ser SALE/VENDA ou PURCHASE/COMPRA.');
  if (!status) errors.push('Estado deve ser PENDING, PAID ou CANCELLED.');
  if (amount === null || amount < 1) errors.push('Valor inválido.');
  if (!issueDate) errors.push('Data de emissão inválida.');
  if (dueDateRaw && !dueDate) errors.push('Data de vencimento inválida.');

  if (errors.length > 0) return { action: 'create', errors };
  return {
    action: 'create',
    errors: [],
    payload: {
      number,
      type: type as 'SALE' | 'PURCHASE',
      status: status as 'PENDING' | 'PAID' | 'CANCELLED',
      amount: amount as number,
      issueDate: issueDate as Date,
      dueDate: dueDate ?? undefined,
      description: optionalText(pick(values, 'description', 'descricao', 'observacao', 'nota')),
    },
  };
}

export const REQUIRED_HEADER_ALIASES: Record<ImportEntity, Array<{ label: string; aliases: string[] }>> = {
  products: [
    { label: 'nome do produto/variante', aliases: ['productName', 'nomeProduto', 'produto', 'variantName', 'nome', 'designacao'] },
    { label: 'peso (kg)', aliases: ['weightKg', 'pesoKg', 'peso', 'kg', 'pesoEmKg', 'capacidade', 'tamanho'] },
    { label: 'preço unitário', aliases: ['unitPrice', 'precoUnitario', 'preco', 'valor', 'pvp', 'precoVenda'] },
  ],
  customers: [
    { label: 'nome', aliases: ['fullName', 'nome', 'nomeCompleto', 'cliente', 'designacao'] },
    { label: 'telefone', aliases: ['phone', 'telefone', 'telemovel', 'celular', 'contacto', 'numero'] },
  ],
  invoices: [
    { label: 'número da fatura', aliases: ['number', 'numero', 'numeroFatura', 'nrFatura', 'fatura', 'documento'] },
    { label: 'tipo', aliases: ['type', 'tipo', 'tipoDocumento'] },
    { label: 'valor', aliases: ['amount', 'valor', 'montante', 'total', 'valorTotal'] },
    { label: 'data de emissão', aliases: ['issueDate', 'dataEmissao', 'data', 'dataDocumento'] },
  ],
};

export const TEMPLATES: Record<ImportEntity, { headers: string[]; example: string[]; required: string[] }> = {
  products: {
    headers: [
      'productSlug',
      'productName',
      'productDescription',
      'sku',
      'variantName',
      'weightKg',
      'unitPrice',
      'cylinderPrice',
      'stockQty',
      'reorderLevel',
    ],
    example: [
      'gas-expresso',
      'Gás Expresso',
      'Catálogo da empresa',
      'GAS-12KG',
      'Botija 12kg',
      '12',
      '15000',
      '0',
      '100',
      '5',
    ],
    required: ['variantName', 'weightKg', 'unitPrice'],
  },
  customers: {
    headers: ['fullName', 'phone', 'email', 'address', 'reference', 'municipality', 'province', 'latitude', 'longitude'],
    example: ['João Manuel', '+244923000000', 'joao@exemplo.ao', 'Rua 1, Casa 2', 'Ao lado da farmácia', 'Luanda', 'Luanda', '', ''],
    required: ['fullName', 'phone'],
  },
  invoices: {
    headers: ['number', 'type', 'status', 'amount', 'issueDate', 'dueDate', 'description'],
    example: ['FT-2025-001', 'SALE', 'PENDING', '150000', '15/01/2025', '15/02/2025', 'Venda de botijas'],
    required: ['number', 'type', 'amount', 'issueDate'],
  },
};
