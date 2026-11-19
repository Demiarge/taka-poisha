import type { CellObject, WorkBook, WorkSheet } from 'xlsx/dist/xlsx.mini.min';

import { UNCATEGORISED } from '@/constants/model';
import { TRANSACTION_SOURCES, type TransactionSource, type TransactionType } from '@/types/transaction';
import { isValidIsoDate } from '@/utils/format';
import { XLSX } from '@/utils/xlsx';

/** One transaction as it appears in a sheet. No id, raw input or embedding. */
export type ExcelRow = {
  date: string;
  type: TransactionType;
  amount: number;
  item: string;
  shop: string | null;
  category: string;
  source: TransactionSource;
};

export type ExportRange = { kind: 'all' } | { kind: 'month'; month: string } | { kind: 'range'; from: string; to: string };

export const IMPORT_LIMITS = { fileBytes: 5 * 1024 * 1024, rows: 20_000, sheets: 240, item: 120, shop: 80, category: 40 };

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const HEADERS = ['Date', 'Type', 'Amount', 'Item', 'Shop', 'Category', 'Source'];
const REQUIRED = ['date', 'type', 'amount', 'item', 'category'];
const SUMMARY = 'Summary';
const MONTH_SHEET = /^\d{4}-(0[1-9]|1[0-2])$/;
const AMOUNT_FORMAT = '#,##0.00';
const MAX_AMOUNT = 1e12;
// Every .xlsx is a zip. Checking first keeps SheetJS's text parsers (CSV, HTML) away from other files.
const ZIP_START = [0x50, 0x4b, 0x03, 0x04];

/** A file refused as a whole. The message is shown to the user. */
export class ImportError extends Error {}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Inclusive "YYYY-MM-DD" bounds, or null for everything. "-31" works for any month because dates compare as text. */
export function rangeBounds(range: ExportRange): { from: string; to: string } | null {
  if (range.kind === 'all') {
    return null;
  }
  return range.kind === 'month' ? { from: `${range.month}-01`, to: `${range.month}-31` } : range;
}

export function exportFileName(range: ExportRange): string {
  const label = range.kind === 'all' ? 'all' : range.kind === 'month' ? range.month : `${range.from}_to_${range.to}`;
  return `taka-poisha-${label}.xlsx`;
}

// String cells are never formulas, even for text like "=1+1".
const textCell = (value: string): CellObject => ({ t: 's', v: value });
const moneyCell = (value: number): CellObject => ({ t: 'n', v: round2(value), z: AMOUNT_FORMAT });

function summarySheet(rows: ExcelRow[], months: string[]): WorkSheet {
  const byMonth = new Map(months.map((month) => [month, { income: 0, expense: 0 }]));
  const byCategory = new Map<string, { type: TransactionType; name: string; total: number }>();
  for (const row of rows) {
    byMonth.get(row.date.slice(0, 7))![row.type] += row.amount;
    const key = `${row.type}|${noCase(row.category)}`;
    const entry = byCategory.get(key) ?? { type: row.type, name: row.category, total: 0 };
    entry.total += row.amount;
    byCategory.set(key, entry);
  }
  const totals = [...byMonth.values()].reduce(
    (sum, month) => ({ income: sum.income + month.income, expense: sum.expense + month.expense }),
    { income: 0, expense: 0 },
  );
  const categories = [...byCategory.values()].sort(
    (a, b) => (a.type === b.type ? b.total - a.total || a.name.localeCompare(b.name) : a.type === 'expense' ? -1 : 1),
  );
  const monthRow = (label: string, { income, expense }: { income: number; expense: number }) => [
    textCell(label),
    moneyCell(income),
    moneyCell(expense),
    moneyCell(income - expense),
  ];

  const sheet = XLSX.utils.aoa_to_sheet([
    ['Month', 'Income', 'Expense', 'Net'].map(textCell),
    ...months.map((month) => monthRow(month, byMonth.get(month)!)),
    monthRow('Total', totals),
    [],
    ['Type', 'Category', 'Total'].map(textCell),
    ...categories.map((entry) => [textCell(entry.type), textCell(entry.name), moneyCell(entry.total)]),
  ]);
  sheet['!cols'] = [12, 18, 14, 14].map((wch) => ({ wch }));
  return sheet;
}

/** Rows newest first. A Summary sheet, then one sheet per month, newest first. */
export function buildWorkbook(rows: ExcelRow[]): Uint8Array {
  const byMonth = new Map<string, ExcelRow[]>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), row]);
  }
  const months = [...byMonth.keys()].sort().reverse();

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, summarySheet(rows, months), SUMMARY);
  for (const month of months) {
    const sheet = XLSX.utils.aoa_to_sheet([
      HEADERS.map(textCell),
      ...byMonth.get(month)!.map((row) => [
        textCell(row.date),
        textCell(row.type),
        moneyCell(row.amount),
        textCell(row.item),
        // No cell at all for a missing shop, so it reads back as empty.
        row.shop === null ? null : textCell(row.shop),
        textCell(row.category),
        textCell(row.source),
      ]),
    ]);
    sheet['!cols'] = [12, 9, 12, 32, 22, 18, 14].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, sheet, month);
  }
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true }));
}

export type BadRow = { sheet: string; row: number; reason: string };
export type SkippedSheet = { sheet: string; reason: string };
export type ParsedWorkbook = { rows: ExcelRow[]; bad: BadRow[]; skipped: SkippedSheet[] };

type CellValue = string | number | boolean | Date | null;

function cellValue(cell: CellObject | undefined): CellValue {
  if (!cell || cell.t === 'z' || cell.t === 'e') {
    return null;
  }
  return cell.v ?? null;
}

const cleanText = (value: CellValue) => (value === null || value instanceof Date ? '' : String(value).trim());

/** Cut by characters, not UTF-16 units, so a character is never split. */
const cap = (text: string, length: number) => Array.from(text).slice(0, length).join('').trim();

/** "YYYY-MM-DD" text, or an Excel date number if the file was edited in Excel. No time zones either way. */
function toIsoDate(value: CellValue): string | null {
  if (typeof value === 'number') {
    if (!(value >= 1 && value < 2958466)) {
      return null;
    }
    const { y, m, d } = XLSX.SSF.parse_date_code(value);
    value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const text = cleanText(value);
  return isValidIsoDate(text) && text >= '1900-01-01' ? text : null;
}

function toAmount(value: CellValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? round2(value) : null;
  }
  const text = cleanText(value).replace(/^(৳|tk\.?|bdt)/i, '').replace(/[,\s]/g, '');
  return /^-?\d+(\.\d+)?$/.test(text) ? round2(Number(text)) : null;
}

const isSource = (value: string): value is TransactionSource => (TRANSACTION_SOURCES as readonly string[]).includes(value);

/** A valid row, or why it isn't one. */
function parseRow(read: (column: string) => CellValue, today: string): ExcelRow | string {
  const date = toIsoDate(read('date'));
  if (!date) {
    return 'Date isn’t a real date (use YYYY-MM-DD)';
  }
  if (date > today) {
    return 'Date is in the future';
  }
  const type = cleanText(read('type')).toLowerCase();
  if (type !== 'income' && type !== 'expense') {
    return 'Type must be income or expense';
  }
  const amount = toAmount(read('amount'));
  if (amount === null) {
    return 'Amount isn’t a number';
  }
  if (amount <= 0) {
    return 'Amount must be more than 0';
  }
  if (amount > MAX_AMOUNT) {
    return 'Amount is too large';
  }
  const item = cap(cleanText(read('item')), IMPORT_LIMITS.item);
  if (!item) {
    return 'Item is empty';
  }
  const source = cleanText(read('source')).toLowerCase();
  return {
    date,
    type,
    amount,
    item,
    shop: cap(cleanText(read('shop')), IMPORT_LIMITS.shop) || null,
    category: cap(cleanText(read('category')), IMPORT_LIMITS.category) || UNCATEGORISED,
    source: isSource(source) ? source : 'import',
  };
}

/** Also called before reading a picked file, so a huge one is never loaded. */
export function checkFileSize(bytes: number): void {
  if (bytes > IMPORT_LIMITS.fileBytes) {
    throw new ImportError(`This file is ${(bytes / 1024 / 1024).toFixed(1)} MB. Files up to 5 MB can be imported.`);
  }
}

/** Reads every month sheet ("YYYY-MM"). Skips Summary and sheets without the needed headers. */
export function parseWorkbook(bytes: Uint8Array, today: string): ParsedWorkbook {
  checkFileSize(bytes.length);
  if (!ZIP_START.every((byte, index) => bytes[index] === byte)) {
    throw new ImportError('This isn’t an Excel (.xlsx) file.');
  }
  let book: WorkBook;
  try {
    // One row past the limit, so a sheet that was cut short still trips the row check.
    book = XLSX.read(bytes, {
      type: 'array',
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellText: false,
      sheetRows: IMPORT_LIMITS.rows + 2,
    });
  } catch {
    throw new ImportError('This file couldn’t be read. It may be damaged, or not an .xlsx file.');
  }

  const monthSheets = book.SheetNames.filter((name) => MONTH_SHEET.test(name.trim())).length;
  if (monthSheets > IMPORT_LIMITS.sheets) {
    throw new ImportError(`This file has ${monthSheets} month sheets. Up to ${IMPORT_LIMITS.sheets} can be imported.`);
  }

  const parsed: ParsedWorkbook = { rows: [], bad: [], skipped: [] };
  let rowCount = 0;
  for (const name of book.SheetNames) {
    if (name.trim().toLowerCase() === SUMMARY.toLowerCase()) {
      continue;
    }
    if (!MONTH_SHEET.test(name.trim())) {
      parsed.skipped.push({ sheet: name, reason: 'Not a month sheet' });
      continue;
    }
    const grid: (CellObject | undefined)[][] = book.Sheets[name]['!data'] ?? [];
    const headerAt = grid.findIndex((cells) => cells?.some((cell) => cleanText(cellValue(cell)) !== ''));
    if (headerAt < 0) {
      parsed.skipped.push({ sheet: name, reason: 'Empty' });
      continue;
    }
    const columns = new Map<string, number>();
    grid[headerAt].forEach((cell, index) => {
      const header = cleanText(cellValue(cell)).toLowerCase();
      if (header && !columns.has(header)) {
        columns.set(header, index);
      }
    });
    const missing = REQUIRED.filter((header) => !columns.has(header));
    if (missing.length > 0) {
      const names = missing.map((header) => header[0].toUpperCase() + header.slice(1)).join(', ');
      parsed.skipped.push({ sheet: name, reason: `Headers don’t match (no ${names})` });
      continue;
    }

    for (let index = headerAt + 1; index < grid.length; index++) {
      const cells = grid[index];
      const read = (column: string): CellValue => {
        const at = columns.get(column);
        return at === undefined || !cells ? null : cellValue(cells[at]);
      };
      if ([...columns.keys()].every((column) => cleanText(read(column)) === '')) {
        continue;
      }
      rowCount++;
      if (rowCount > IMPORT_LIMITS.rows) {
        throw new ImportError(`This file has more than ${IMPORT_LIMITS.rows.toLocaleString('en-US')} rows, the most that can be imported at once.`);
      }
      const row = parseRow(read, today);
      if (typeof row === 'string') {
        parsed.bad.push({ sheet: name, row: index + 1, reason: row });
      } else {
        parsed.rows.push(row);
      }
    }
  }
  return parsed;
}

/** SQLite's NOCASE folds only A-Z, so this does too. */
export const noCase = (text: string) => text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());

export type ExistingRow = Pick<ExcelRow, 'date' | 'type' | 'amount' | 'item' | 'shop'>;
export type CategoryName = { type: TransactionType; name: string };
export type ImportPlan = { fresh: ExcelRow[]; duplicates: number; newCategories: CategoryName[] };

/** Content, not ids, because ids differ between phones and installs. */
export function contentKey(row: ExistingRow): string {
  const fold = (text: string | null) => (text ?? '').trim().toLowerCase();
  return [row.date, row.type, row.amount.toFixed(2), fold(row.item), fold(row.shop)].join('\u0001');
}

/**
 * Counts matches rather than just finding them: two identical teas in the file and one in the database means one is new.
 * Categories match like the database does, by type and case-insensitive name.
 */
export function planImport(rows: ExcelRow[], existing: ExistingRow[], categories: CategoryName[]): ImportPlan {
  const left = new Map<string, number>();
  for (const row of existing) {
    const key = contentKey(row);
    left.set(key, (left.get(key) ?? 0) + 1);
  }
  const fresh: ExcelRow[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const key = contentKey(row);
    const count = left.get(key) ?? 0;
    if (count > 0) {
      left.set(key, count - 1);
      duplicates++;
    } else {
      fresh.push(row);
    }
  }

  const known = new Set(categories.map((category) => `${category.type}|${noCase(category.name)}`));
  const newCategories: CategoryName[] = [];
  for (const row of fresh) {
    const key = `${row.type}|${noCase(row.category)}`;
    if (!known.has(key)) {
      known.add(key);
      newCategories.push({ type: row.type, name: row.category });
    }
  }
  return { fresh, duplicates, newCategories };
}
