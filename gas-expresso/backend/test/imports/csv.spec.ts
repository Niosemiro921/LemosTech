import { describe, expect, it } from 'vitest';
import {
  normalizeKey,
  normalizePhone,
  parseCsv,
  parseDateValue,
  parseInteger,
  serializeCsv,
} from '../../src/modules/imports/application/csv';
import { normalizeCustomer, normalizeInvoice, normalizeProduct, TEMPLATES } from '../../src/modules/imports/application/imports.types';

describe('parseCsv', () => {
  it('lê CSV com BOM, ponto e vírgula e campos entre aspas', () => {
    const csv = '\uFEFFsku;nome;descricao\r\nGAS-12KG;"Botija 12kg";"Gás, butano"\r\nGAS-45KG;Botija 45kg;"Linha 1\nLinha 2"\r\n';
    const table = parseCsv(csv);
    expect(table.delimiter).toBe(';');
    expect(table.headers).toEqual(['sku', 'nome', 'descricao']);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].values).toMatchObject({ sku: 'GAS-12KG', nome: 'Botija 12kg', descricao: 'Gás, butano' });
    expect(table.rows[1].values.descricao).toBe('Linha 1\nLinha 2');
  });

  it('deteta vírgula como separador', () => {
    const table = parseCsv('a,b,c\n1,2,3\n');
    expect(table.delimiter).toBe(',');
    expect(table.rows[0].values).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('ignora linhas vazias e normaliza cabeçalhos com acentos', () => {
    const table = parseCsv('Preço Unitário;Peso (kg)\n15000;12\n\n');
    expect(table.keys).toEqual(['precounitario', 'pesokg']);
    expect(table.rows).toHaveLength(1);
    expect(normalizeKey('Endereço · Principal')).toBe('enderecoprincipal');
  });
});

describe('normalização de valores', () => {
  it('converte números nos formatos angolanos/europeus', () => {
    expect(parseInteger('1.234,56')).toBe(1235);
    expect(parseInteger('15000')).toBe(15000);
    expect(parseInteger('15 000 Kz')).toBe(15000);
    expect(parseInteger('')).toBeNull();
  });

  it('interpreta datas ISO e DD/MM/AAAA', () => {
    expect(parseDateValue('2025-01-15')?.toISOString().slice(0, 10)).toBe('2025-01-15');
    expect(parseDateValue('15/01/2025')?.toISOString().slice(0, 10)).toBe('2025-01-15');
    expect(parseDateValue('31/02/2025')).toBeNull();
  });

  it('normaliza telefones para +244', () => {
    expect(normalizePhone('923 000 000')).toBe('+244923000000');
    expect(normalizePhone('+244 923000000')).toBe('+244923000000');
    expect(normalizePhone('244923000000')).toBe('+244923000000');
  });
});

describe('normalizadores de linhas', () => {
  it('valida produto completo', () => {
    const row = normalizeProduct({
      sku: 'gas-12kg',
      variantname: 'Botija 12kg',
      weightkg: '12',
      unitprice: '15000',
      cylinderprice: '25000',
      stockqty: '100',
      reorderlevel: '5',
    });
    expect(row.errors).toEqual([]);
    expect(row.payload).toMatchObject({
      productSlug: 'botija-12kg',
      sku: 'GAS-12KG',
      weightKg: 12,
      unitPrice: 15000,
      cylinderPrice: 25000,
      stockQty: 100,
      reorderLevel: 5,
    });
  });

  it('rejeita produto com peso e preço inválidos', () => {
    const row = normalizeProduct({ variantname: 'Botija', weightkg: '0', unitprice: 'abc' });
    expect(row.payload).toBeUndefined();
    expect(row.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('gera SKU automático e aceita cabeçalhos simples em português', () => {
    const row = normalizeProduct({ produto: 'Botija 12kg', peso: '12', preco: '15000', quantidade: '10' });
    expect(row.errors).toEqual([]);
    expect(row.payload).toMatchObject({
      productName: 'Botija 12kg',
      sku: 'AUTO-BOTIJA-12KG-12KG',
      weightKg: 12,
      unitPrice: 15000,
      stockQty: 10,
    });
  });

  it('valida cliente e rejeita email inválido', () => {
    const valid = normalizeCustomer({ nome: 'João', telefone: '923000000' });
    expect(valid.payload).toMatchObject({ fullName: 'João', phone: '+244923000000' });
    const invalid = normalizeCustomer({ nome: 'João', telefone: '923000000', email: 'invalido' });
    expect(invalid.errors).toContain('Email inválido.');
  });

  it('mapeia tipos e estados de faturas em português', () => {
    const row = normalizeInvoice({
      numero: 'FT-1',
      tipo: 'venda',
      estado: 'pago',
      valor: '150.000',
      dataemissao: '15/01/2025',
    });
    expect(row.errors).toEqual([]);
    expect(row.payload).toMatchObject({ number: 'FT-1', type: 'SALE', status: 'PAID', amount: 150000 });
  });
});

describe('templates', () => {
  it('gera CSV reimportável para cada entidade', () => {
    for (const template of Object.values(TEMPLATES)) {
      const parsed = parseCsv(serializeCsv(template.headers, [template.example]));
      expect(parsed.headers).toEqual(template.headers);
      expect(parsed.rows).toHaveLength(1);
    }
  });
});
