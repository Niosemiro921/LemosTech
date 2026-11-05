import { apiGet, apiPost } from '../lib/api';

export type ImportEntity = 'products' | 'customers' | 'invoices';

export interface ImportEntityInfo {
  key: ImportEntity;
  label: string;
  description: string;
  fileName: string;
}

export const IMPORT_ENTITY_INFO: ImportEntityInfo[] = [
  {
    key: 'products',
    label: 'Produtos, variantes e stock',
    description: 'Cria ou atualiza o catálogo por SKU e define as quantidades iniciais em stock.',
    fileName: 'products-modelo.csv',
  },
  {
    key: 'customers',
    label: 'Clientes',
    description: 'Cria contas de cliente com telefone, email e endereço principal.',
    fileName: 'customers-modelo.csv',
  },
  {
    key: 'invoices',
    label: 'Faturas e documentos',
    description: 'Regista faturas de venda e compra com datas, valores e estados.',
    fileName: 'invoices-modelo.csv',
  },
];

export interface ImportRow {
  line: number;
  action: 'create' | 'update' | 'skip';
  valid: boolean;
  errors: string[];
  message?: string;
  values: Record<string, string>;
}

export interface ImportPreview {
  entity: ImportEntity;
  fileName: string;
  headers: string[];
  total: number;
  valid: number;
  invalid: number;
  skipped: number;
  rows: ImportRow[];
  truncated: boolean;
  warnings: string[];
}

export interface ImportCommitResult {
  entity: ImportEntity;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ line: number; message: string }>;
}

export interface ImportTemplate {
  entity: ImportEntity;
  filename: string;
  content: string;
}

const entityFileNames: Record<ImportEntity, string> = {
  products: 'products-modelo.csv',
  customers: 'customers-modelo.csv',
  invoices: 'invoices-modelo.csv',
};

export const fetchImportTemplate = (entity: ImportEntity) =>
  apiGet<ImportTemplate>(`/imports/templates/${encodeURIComponent(entity)}`);

export function buildImportFormData(entity: ImportEntity, file: File, supplierUserId?: string) {
  const data = new FormData();
  data.append('file', file);
  data.append('entity', entity);
  if (supplierUserId) data.append('supplierUserId', supplierUserId);
  return data;
}

export const previewImport = (entity: ImportEntity, file: File, supplierUserId?: string) =>
  apiPost<ImportPreview>('/imports/preview', buildImportFormData(entity, file, supplierUserId));

export const commitImport = (entity: ImportEntity, file: File, supplierUserId?: string) =>
  apiPost<ImportCommitResult>('/imports/commit', buildImportFormData(entity, file, supplierUserId));

export function downloadTemplateFile(template: ImportTemplate) {
  const blob = new Blob([template.content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = template.filename || entityFileNames[template.entity];
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
