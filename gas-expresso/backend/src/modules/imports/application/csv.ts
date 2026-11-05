export interface ParsedCsvRow {
  line: number;
  values: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  keys: string[];
  rows: ParsedCsvRow[];
  delimiter: string;
}

const DELIMITERS = [';', ',', '\t'];

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
  let best = ',';
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = countDelimiter(firstLine, delimiter);
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

export function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowStartLine = 1;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === '') {
      quoted = true;
      field = '';
      continue;
    }
    if (char === delimiter) {
      pushField();
      continue;
    }
    if (char === '\r') continue;
    if (char === '\n') {
      pushRow();
      line += 1;
      rowStartLine = line;
      continue;
    }
    field += char;
  }

  if (field !== '' || row.length > 0) {
    pushRow();
  }

  const headerRow = rows.shift();
  if (!headerRow) return { headers: [], keys: [], rows: [], delimiter };

  const headers = headerRow.map((header) => header.trim());
  const keys = headers.map((header) => normalizeKey(header));
  const parsedRows: ParsedCsvRow[] = rows.map((values, index) => {
    const mapped: Record<string, string> = {};
    keys.forEach((key, keyIndex) => {
      if (!key) return;
      mapped[key] = (values[keyIndex] ?? '').trim();
    });
    return { line: index + 2, values: mapped };
  });

  return { headers, keys, rows: parsedRows, delimiter };
}

function escapeCsvValue(value: string, delimiter: string) {
  if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function serializeCsv(headers: string[], rows: string[][], delimiter = ';') {
  const lines = [headers, ...rows].map((columns) => columns.map((value) => escapeCsvValue(value, delimiter)).join(delimiter));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function decodeCsvBuffer(buffer: Buffer) {
  const utf8 = buffer.toString('utf8');
  if (utf8.includes('\uFFFD')) return buffer.toString('latin1');
  return utf8;
}

export function pick(values: Record<string, string>, ...aliases: string[]) {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (values[key] !== undefined && values[key] !== '') return values[key];
  }
  return '';
}

export function hasAnyKey(keys: string[], ...aliases: string[]) {
  const compact = new Set(keys);
  return aliases.some((alias) => compact.has(normalizeKey(alias)));
}

export function parseInteger(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

export function parseDecimal(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDateValue(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (local) {
    const [day, month, year] = [Number(local[1]), Number(local[2]), Number(local[3])];
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, '');
  const compact = digits.replace(/^\+/, '');
  if (/^244\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\d{9}$/.test(compact)) return `+244${compact}`;
  return digits.startsWith('+') ? `+${compact}` : compact;
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
