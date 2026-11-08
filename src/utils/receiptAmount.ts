export type BillTotal = { label: string; amount: number };

// Highest priority first; within a level the last line wins, since totals sit at the bottom.
const TOTAL_LABELS: RegExp[] = [
  /\b(net\s*payable|total\s*payable|amount\s*payable|net\s*amount)\b/i,
  /\b(grand\s*total|bill\s*amount|amount\s*due|total\s*due)\b/i,
  /\btotal\b/i,
];

// Lines that carry a number but aren't the bill total.
const NOT_TOTAL =
  /\b(sub\s*-?\s*total|total\s*(qty|quantity|items?)|items?\s*count|no\.?\s*of\s*items|paid|cash|tendered|received|change|return|refund|discount)\b/i;
const TAX_LINE = /\b(vat|tax)\b/i;
const INCLUDES_TAX = /\bincl/i;

// "2,205.00", "1,05,000", "850": groups of digits with optional commas and up to two decimals.
const AMOUNT = /(?<![\d,/%-])(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?(?![\d/%])/g;
const CURRENCY_WORDS = /\b(tk|bdt|taka)\b/gi;

/** The last plain amount on a line ("Total : 2,205.00" → 2205), skipping dates and percentages. */
export function lastAmount(line: string): number | null {
  const matches = [...line.matchAll(AMOUNT)];
  const last = matches.at(-1);
  if (!last) {
    return null;
  }
  return Number(`${last[1].replace(/,/g, '')}.${last[2] ?? '0'}`);
}

function labelOf(line: string): string {
  return line
    .replace(AMOUNT, '')
    .replace(CURRENCY_WORDS, '')
    .replace(/[^a-zA-Z.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .trim();
}

/** The bill total printed on a receipt, or null when no labelled total is found. */
export function findBillTotal(text: string): BillTotal | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const pattern of TOTAL_LABELS) {
    let found: BillTotal | null = null;
    lines.forEach((line, i) => {
      if (!pattern.test(line) || NOT_TOTAL.test(line) || (TAX_LINE.test(line) && !INCLUDES_TAX.test(line))) {
        return;
      }
      // OCR sometimes puts the amount on the next line, under its label.
      const next = lines[i + 1];
      const nextIsJustAmount = next !== undefined && !/[a-z]{3}/i.test(next.replace(CURRENCY_WORDS, ''));
      const amount = lastAmount(line) ?? (nextIsJustAmount ? lastAmount(next) : null);
      if (amount !== null && amount > 0) {
        found = { label: labelOf(line), amount };
      }
    });
    if (found) {
      return found;
    }
  }
  return null;
}

/** Which labelled line printed this amount, e.g. "Paid" for 2500, so a note can say what was replaced. */
export function labelForAmount(text: string, amount: number): string | null {
  const line = text.split(/\r?\n/).find((l) => lastAmount(l) === amount && /[a-z]/i.test(l));
  return line ? labelOf(line) : null;
}
