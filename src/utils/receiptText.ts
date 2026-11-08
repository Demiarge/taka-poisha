// No imports, so the PC tests in training/receipt-test can run this file directly.

/**
 * Fixes common OCR slips in numbers and dates: "1, 276.50" → "1,276.50", "410. 00" → "410.00",
 * "21.0O" → "21.00", "07/11/ 2026" → "07/11/2026".
 */
export function cleanOcrText(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/(\d)[oO](?=\d|\b)/g, '$10')
        .replace(/(\d),\s+(\d{3})(?!\d)/g, '$1,$2')
        .replace(/(\d)\.\s+(\d{2})(?!\d)/g, '$1.$2')
        .replace(/(\d)\s*([/-])\s+(?=\d|[A-Za-z]{3})/g, '$1$2')
        .replace(/([A-Za-z]{3})\s*-\s+(?=\d)/g, '$1-'),
    )
    .join('\n');
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NUMERIC_DATE = /(?<![\d/.-])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d/.-])/g;
const MONTH_DATE = /(?<!\d)(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.-]*(\d{4}|\d{2})(?!\d)/gi;
// Unambiguous forms: 2026-11-07 and Nov 7, 2026.
const ISO_DATE = /(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g;
const MONTH_FIRST_DATE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?!\d)/gi;

function toIso(day: number, month: number, year: number): string | null {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  // Rejects 31/02 and month 13, which Date would roll over.
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The first real, not-future date printed on a receipt. Numbers are read day first (07/11/26 is 7 November 2026). */
export function findReceiptDate(text: string, today: string): string | null {
  const found: { index: number; iso: string }[] = [];
  for (const m of text.matchAll(NUMERIC_DATE)) {
    const iso = toIso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) found.push({ index: m.index ?? 0, iso });
  }
  for (const m of text.matchAll(MONTH_DATE)) {
    const iso = toIso(Number(m[1]), MONTHS.indexOf(m[2].toLowerCase()) + 1, Number(m[3]));
    if (iso) found.push({ index: m.index ?? 0, iso });
  }
  for (const m of text.matchAll(ISO_DATE)) {
    const iso = toIso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) found.push({ index: m.index ?? 0, iso });
  }
  for (const m of text.matchAll(MONTH_FIRST_DATE)) {
    const iso = toIso(Number(m[2]), MONTHS.indexOf(m[1].toLowerCase()) + 1, Number(m[3]));
    if (iso) found.push({ index: m.index ?? 0, iso });
  }
  return found.sort((a, b) => a.index - b.index).find((d) => d.iso <= today)?.iso ?? null;
}

// Top lines that aren't the shop name.
const NOT_SHOP =
  /\b(receipt|sample|invoice|cash\s*memo|order|summary|thank|memo|bill|table|cashier|tel|hotline|bin|lic|vat|road|area|market|bazar|dhaka)\b/i;
const HEADER_ROWS = 6;
// A model shop answer that is really a header line, like "SAMPLENOT A REAL RECEIPT" (no word boundaries: OCR glues words).
const JUNK_SHOP = /(receipt|sample|invoice|cash\s*memo|not\s*a\s*real|\*\*\*)/i;

function isNameLine(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, '').length;
  return letters >= 3 && !/\d/.test(line) && !NOT_SHOP.test(line) && letters / line.replace(/\s/g, '').length > 0.8;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{2,}/g) ?? [];
}

/**
 * The shop name from the receipt's top lines. A name split over two short capital lines
 * ("BANGER BACHA" / "BIRYANI HOUSE") is joined. If the model's shop matches a top line, that whole line wins;
 * if the model gave none, the first name line is used.
 */
export function findShop(rows: string[], modelShop: string | null): string | null {
  const top = rows.slice(0, HEADER_ROWS).map((row) => row.trim());
  const names: string[] = [];
  for (let i = 0; i < top.length; i++) {
    if (!isNameLine(top[i])) continue;
    const next = top[i + 1];
    const short = (line: string) => line.length <= 20 && line === line.toUpperCase();
    if (names.length === 0 && next && isNameLine(next) && short(top[i]) && short(next)) {
      names.push(`${top[i]} ${next}`);
      i++;
    } else {
      names.push(top[i]);
    }
  }
  const wanted = modelShop && !JUNK_SHOP.test(modelShop) ? words(modelShop) : [];
  if (wanted.length === 0) {
    return names[0] ?? null;
  }
  const match = names.find((line) => {
    const have = new Set(words(line));
    return wanted.filter((word) => have.has(word)).length / wanted.length >= 0.5;
  });
  return match ?? modelShop?.trim() ?? null;
}

/** The summary items Gemma learned for receipts; anything else should appear on the receipt itself. */
const TRAINED_RECEIPT_ITEMS = ['groceries', 'food', 'clothes', 'electronics', 'medicine'];

const NOT_PRODUCT =
  /\b(receipt|sample|invoice|memo|order|summary|no|inv|bill|table|cashier|time|tel|hotline|bin|lic|road|house|area|dhaka|total|subtotal|paid|cash|change|vat|discount)\b/i;

/** The first product line after the header, without its quantity and price ("2x Chicken Burger  Tk 560.00" → "Chicken Burger"). */
export function firstProductLine(rows: string[], shop: string | null): string | null {
  for (const row of rows) {
    const line = row
      .replace(/^\s*\d+\s*[xX]\s+/, '')
      .replace(/(tk|৳)?\s*[\d,]+(\.\d+)?\s*$/i, '')
      .trim();
    const letters = line.replace(/[^a-zA-Z]/g, '').length;
    if (letters < 3 || NOT_PRODUCT.test(line) || /\d{1,2}[/.-]\d{1,2}[/.-]\d{2}/.test(line)) continue;
    if (shop && shop.toLowerCase().includes(line.toLowerCase())) continue;
    if (line === line.toUpperCase() && rows.indexOf(row) < HEADER_ROWS) continue;
    return line;
  }
  return null;
}

/** Keeps a trained summary word or an item printed on the receipt; otherwise uses the first product line. */
export function checkReceiptItem(item: string, text: string, rows: string[], shop: string | null): string {
  const wanted = item.trim().toLowerCase();
  if (wanted && (TRAINED_RECEIPT_ITEMS.includes(wanted) || text.toLowerCase().includes(wanted))) {
    return item;
  }
  return firstProductLine(rows, shop) ?? item;
}
