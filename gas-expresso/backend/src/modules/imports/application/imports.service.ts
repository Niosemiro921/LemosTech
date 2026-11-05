import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Role } from '../../../shared/domain/auth.enums';
import {
  decodeCsvBuffer,
  hasAnyKey,
  parseCsv,
  serializeCsv,
  type ParsedCsv,
} from './csv';
import {
  isImportEntity,
  normalizeCustomer,
  normalizeInvoice,
  normalizeProduct,
  REQUIRED_HEADER_ALIASES,
  TEMPLATES,
  type CustomerImportPayload,
  type ImportEntity,
  type ImportPayload,
  type InvoiceImportPayload,
  type ProductImportPayload,
} from './imports.types';

const MAX_ROWS = 5000;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PREVIEW_ROW_LIMIT = 200;

export interface UploadedCsvFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

export interface ImportActor {
  sub: string;
  role: Role | string;
}

interface AnalyzedRow {
  line: number;
  action: 'create' | 'update' | 'skip';
  errors: string[];
  message?: string;
  payload?: ImportPayload;
  values: Record<string, string>;
}

export interface ImportRowView {
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
  rows: ImportRowView[];
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

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getTemplate(entity?: string) {
    const normalized = this.assertEntity(entity);
    const template = TEMPLATES[normalized];
    const content = serializeCsv(template.headers, [template.example]);
    return { entity: normalized, filename: `${normalized}-modelo.csv`, content };
  }

  async preview(actor: ImportActor, entity: string | undefined, file: UploadedCsvFile | undefined, supplierUserId?: string): Promise<ImportPreview> {
    const normalizedEntity = this.assertEntity(entity);
    const table = this.readTable(file);
    const supplierId = await this.resolveSupplierId(actor, supplierUserId);
    const rows = await this.analyze(normalizedEntity, table, supplierId);
    const warnings = this.buildWarnings(normalizedEntity, table);
    const invalid = rows.filter((row) => row.errors.length > 0).length;
    const skipped = rows.filter((row) => row.errors.length === 0 && row.action === 'skip').length;
    const valid = rows.length - invalid;

    return {
      entity: normalizedEntity,
      fileName: file?.originalname ?? '',
      headers: table.headers,
      total: rows.length,
      valid,
      invalid,
      skipped,
      rows: rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => ({
        line: row.line,
        action: row.action,
        valid: row.errors.length === 0,
        errors: row.errors,
        message: row.message,
        values: row.values,
      })),
      truncated: rows.length > PREVIEW_ROW_LIMIT,
      warnings,
    };
  }

  async commit(actor: ImportActor, entity: string | undefined, file: UploadedCsvFile | undefined, supplierUserId?: string): Promise<ImportCommitResult> {
    const normalizedEntity = this.assertEntity(entity);
    const table = this.readTable(file);
    const supplierId = await this.resolveSupplierId(actor, supplierUserId);
    const rows = await this.analyze(normalizedEntity, table, supplierId);
    const result: ImportCommitResult = {
      entity: normalizedEntity,
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const preparable = rows.filter((row) => row.errors.length === 0 && row.action !== 'skip' && row.payload);
    const passwordHashes = normalizedEntity === 'customers'
      ? await Promise.all(preparable.map(() => bcrypt.hash(randomBytes(18).toString('hex'), 10)))
      : [];
    let hashIndex = 0;

    for (const row of rows) {
      if (row.errors.length > 0) {
        result.failed += 1;
        result.errors.push({ line: row.line, message: row.errors.join(' ') });
        continue;
      }
      if (row.action === 'skip' || !row.payload) {
        result.skipped += 1;
        continue;
      }
      try {
        if (normalizedEntity === 'products') {
          const action = await this.commitProduct(row.payload as ProductImportPayload, supplierId);
          if (action === 'updated') result.updated += 1;
          else result.created += 1;
        } else if (normalizedEntity === 'customers') {
          await this.commitCustomer(row.payload as CustomerImportPayload, passwordHashes[hashIndex]);
          hashIndex += 1;
          result.created += 1;
        } else {
          await this.commitInvoice(row.payload as InvoiceImportPayload, supplierId as string);
          result.created += 1;
        }
      } catch (error) {
        result.failed += 1;
        const message = error instanceof Error ? error.message : 'Erro desconhecido ao gravar a linha.';
        result.errors.push({ line: row.line, message });
        this.logger.warn(`Falha ao importar linha ${row.line} (${normalizedEntity}): ${message}`);
      }
    }

    this.logger.log(
      `Importação ${normalizedEntity} por ${actor.sub}: ${result.created} criados, ${result.updated} atualizados, ${result.skipped} ignorados, ${result.failed} falhas.`,
    );
    return result;
  }

  private assertEntity(entity?: string): ImportEntity {
    if (!entity || !isImportEntity(entity)) {
      throw new BadRequestException('Tipo de importação inválido. Use products, customers ou invoices.');
    }
    return entity;
  }

  private readTable(file?: UploadedCsvFile): ParsedCsv {
    if (!file?.buffer?.length) throw new BadRequestException('Ficheiro CSV obrigatório.');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('O ficheiro não pode ultrapassar 5 MB.');
    const name = (file.originalname ?? '').toLowerCase();
    if (name && !name.endsWith('.csv')) {
      throw new BadRequestException('Envie um ficheiro .csv (no Excel: Guardar como → CSV UTF-8).');
    }
    const table = parseCsv(decodeCsvBuffer(file.buffer));
    if (!table.rows.length) throw new BadRequestException('O ficheiro não contém linhas de dados.');
    if (table.rows.length > MAX_ROWS) throw new BadRequestException(`Máximo de ${MAX_ROWS} linhas por importação.`);
    return table;
  }

  private async resolveSupplierId(actor: ImportActor, requestedUserId?: string) {
    if (actor.role === Role.ADMIN) {
      if (!requestedUserId?.trim()) return null;
      const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId: requestedUserId.trim() }, select: { id: true } });
      if (!supplier) throw new NotFoundException('Fornecedor indicado não encontrado.');
      return supplier.id;
    }
    if (actor.role === Role.SUPPLIER) {
      const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId: actor.sub }, select: { id: true } });
      if (!supplier) throw new ForbiddenException('Perfil de fornecedor não encontrado.');
      return supplier.id;
    }
    throw new ForbiddenException('Sem permissão para importar dados.');
  }

  private buildWarnings(entity: ImportEntity, table: ParsedCsv) {
    const warnings: string[] = [];
    for (const field of REQUIRED_HEADER_ALIASES[entity]) {
      if (!hasAnyKey(table.keys, ...field.aliases)) {
        warnings.push(`Coluna obrigatória em falta: ${field.label}. Cabeçalhos detetados: ${table.headers.join(' | ')}.`);
      }
    }
    return warnings;
  }

  private async analyze(entity: ImportEntity, table: ParsedCsv, supplierId: string | null): Promise<AnalyzedRow[]> {
    if (entity === 'products') return this.analyzeProducts(table);
    if (entity === 'customers') return this.analyzeCustomers(table);
    return this.analyzeInvoices(table, supplierId);
  }

  private async analyzeProducts(table: ParsedCsv): Promise<AnalyzedRow[]> {
    const rows: AnalyzedRow[] = table.rows.map((row) => {
      const normalized = normalizeProduct(row.values);
      return {
        line: row.line,
        action: normalized.action,
        errors: normalized.errors,
        payload: normalized.payload,
        values: row.values,
      };
    });

    const slugs = [...new Set(rows.map((row) => (row.payload as ProductImportPayload | undefined)?.productSlug).filter(Boolean) as string[])];
    const skus = [...new Set(rows.map((row) => (row.payload as ProductImportPayload | undefined)?.sku).filter(Boolean) as string[])];
    const [products, variants] = await Promise.all([
      slugs.length
        ? this.prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
        : Promise.resolve([]),
      skus.length
        ? this.prisma.productVariant.findMany({
            where: { sku: { in: skus } },
            select: { sku: true, product: { select: { slug: true } } },
          })
        : Promise.resolve([]),
    ]);
    const productBySlug = new Map(products.map((product) => [product.slug, product]));
    const variantBySku = new Map(variants.map((variant) => [variant.sku, variant]));
    const seenSkus = new Set<string>();

    for (const row of rows) {
      if (!row.payload) continue;
      const payload = row.payload as ProductImportPayload;
      const existingVariant = variantBySku.get(payload.sku);
      if (seenSkus.has(payload.sku)) {
        row.action = 'skip';
        row.message = 'SKU repetido no ficheiro.';
        continue;
      }
      seenSkus.add(payload.sku);
      if (existingVariant) {
        if (existingVariant.product.slug !== payload.productSlug) {
          row.errors.push(`O SKU ${payload.sku} já pertence a outro produto (${existingVariant.product.slug}).`);
          continue;
        }
        row.action = 'update';
        row.message = 'Variante existente será atualizada.';
        continue;
      }
      if (productBySlug.has(payload.productSlug)) {
        row.message = 'Produto existente; será criada a variante.';
      } else {
        row.message = 'Produto e variante serão criados.';
      }
    }
    return rows;
  }

  private async analyzeCustomers(table: ParsedCsv): Promise<AnalyzedRow[]> {
    const rows: AnalyzedRow[] = table.rows.map((row) => {
      const normalized = normalizeCustomer(row.values);
      return {
        line: row.line,
        action: normalized.action,
        errors: normalized.errors,
        payload: normalized.payload,
        values: row.values,
      };
    });
    const phones = [...new Set(rows.map((row) => (row.payload as CustomerImportPayload | undefined)?.phone).filter(Boolean) as string[])];
    const emails = [...new Set(rows.map((row) => (row.payload as CustomerImportPayload | undefined)?.email).filter(Boolean) as string[])];
    const [existingCustomers, existingEmails] = await Promise.all([
      phones.length
        ? this.prisma.user.findMany({ where: { role: 'CUSTOMER', phone: { in: phones } }, select: { phone: true } })
        : Promise.resolve([]),
      emails.length
        ? this.prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } })
        : Promise.resolve([]),
    ]);
    const customerPhones = new Set(existingCustomers.map((customer) => customer.phone));
    const usedEmails = new Set(existingEmails.map((user) => user.email?.toLowerCase()));
    const seenPhones = new Set<string>();

    for (const row of rows) {
      if (!row.payload) continue;
      const payload = row.payload as CustomerImportPayload;
      if (seenPhones.has(payload.phone)) {
        row.action = 'skip';
        row.message = 'Telefone repetido no ficheiro.';
        continue;
      }
      seenPhones.add(payload.phone);
      if (customerPhones.has(payload.phone)) {
        row.action = 'skip';
        row.message = 'Cliente já existe com este telefone.';
        continue;
      }
      if (payload.email && usedEmails.has(payload.email.toLowerCase())) {
        row.errors.push('Email já utilizado por outra conta.');
        continue;
      }
      row.message = 'Cliente será criado com palavra-passe temporária.';
    }
    return rows;
  }

  private async analyzeInvoices(table: ParsedCsv, supplierId: string | null): Promise<AnalyzedRow[]> {
    const rows: AnalyzedRow[] = table.rows.map((row) => {
      const normalized = normalizeInvoice(row.values);
      return {
        line: row.line,
        action: normalized.action,
        errors: normalized.errors,
        payload: normalized.payload,
        values: row.values,
      };
    });
    if (!supplierId) {
      for (const row of rows) row.errors.push('Selecione o fornecedor antes de importar faturas.');
      return rows;
    }
    const numbers = [...new Set(rows.map((row) => (row.payload as InvoiceImportPayload | undefined)?.number).filter(Boolean) as string[])];
    const existing = numbers.length
      ? await this.prisma.supplierInvoice.findMany({ where: { supplierId, number: { in: numbers } }, select: { number: true } })
      : [];
    const existingNumbers = new Set(existing.map((invoice) => invoice.number));
    const seenNumbers = new Set<string>();

    for (const row of rows) {
      if (!row.payload) continue;
      const payload = row.payload as InvoiceImportPayload;
      if (seenNumbers.has(payload.number)) {
        row.action = 'skip';
        row.message = 'Número de fatura repetido no ficheiro.';
        continue;
      }
      seenNumbers.add(payload.number);
      if (existingNumbers.has(payload.number)) {
        row.action = 'skip';
        row.message = 'Fatura já existe.';
        continue;
      }
      row.message = 'Fatura será criada.';
    }
    return rows;
  }

  private async commitProduct(payload: ProductImportPayload, supplierId: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const existingVariant = await tx.productVariant.findUnique({ where: { sku: payload.sku }, select: { id: true, productId: true } });
      const product = await tx.product.upsert({
        where: { slug: payload.productSlug },
        update: {
          name: payload.productName,
          ...(payload.productDescription ? { description: payload.productDescription } : {}),
        },
        create: {
          slug: payload.productSlug,
          name: payload.productName,
          description: payload.productDescription ?? null,
        },
      });

      let variantId: string;
      if (existingVariant) {
        if (existingVariant.productId !== product.id) {
          throw new BadRequestException(`O SKU ${payload.sku} pertence a outro produto.`);
        }
        const updated = await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            name: payload.variantName,
            weightKg: payload.weightKg,
            unitPrice: payload.unitPrice,
            cylinderPrice: payload.cylinderPrice,
          },
        });
        variantId = updated.id;
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: payload.sku,
            name: payload.variantName,
            weightKg: payload.weightKg,
            unitPrice: payload.unitPrice,
            cylinderPrice: payload.cylinderPrice,
          },
        });
        variantId = created.id;
      }

      if (supplierId) {
        const inventory = await tx.inventoryItem.findUnique({
          where: { supplierId_variantId: { supplierId, variantId } },
          select: { id: true, reservedQty: true },
        });
        if (inventory) {
          const availableQty = payload.stockQty === undefined
            ? undefined
            : Math.max(payload.stockQty, inventory.reservedQty);
          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              ...(availableQty !== undefined ? { availableQty } : {}),
              ...(payload.reorderLevel !== undefined ? { reorderLevel: payload.reorderLevel } : {}),
            },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              supplierId,
              variantId,
              availableQty: payload.stockQty ?? 0,
              reorderLevel: payload.reorderLevel ?? 5,
            },
          });
        }
      }

      return existingVariant ? 'updated' as const : 'created' as const;
    });
  }

  private async commitCustomer(payload: CustomerImportPayload, passwordHash: string | undefined) {
    if (!passwordHash) throw new BadRequestException('Não foi possível preparar a conta do cliente.');
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: payload.phone,
          email: payload.email ?? null,
          name: payload.fullName,
          passwordHash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          customer: { create: { fullName: payload.fullName } },
          ...(payload.address
            ? {
                addresses: {
                  create: {
                    label: 'Principal',
                    address: payload.address,
                    reference: payload.reference ?? null,
                    municipality: payload.municipality ?? null,
                    province: payload.province ?? null,
                    latitude: payload.latitude ?? null,
                    longitude: payload.longitude ?? null,
                    isDefault: true,
                  },
                },
              }
            : {}),
        },
        select: { id: true },
      });
      return user;
    });
  }

  private async commitInvoice(payload: InvoiceImportPayload, supplierId: string) {
    await this.prisma.supplierInvoice.create({
      data: {
        supplierId,
        number: payload.number,
        type: payload.type,
        status: payload.status,
        amount: payload.amount,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate ?? null,
        paidAt: payload.status === 'PAID' ? new Date() : null,
        description: payload.description ?? null,
      },
    });
  }
}
