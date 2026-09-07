const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
};

/**
 * 2350 → "৳2,350", -500 → "−৳500". Uses South Asian digit grouping, so
 * 100000 → "৳1,00,000".
 */
export function formatAmount(amount: number, currency = 'BDT'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const sign = amount < 0 ? '−' : '';
  return `${sign}${symbol}${Math.abs(amount).toLocaleString('en-IN')}`;
}

/** "2026-10-28" → "28 Oct 2026" */
export function formatDate(isoDate: string): string {
  // Build the date from its parts: new Date("2026-10-28") would parse as UTC
  // midnight and can show the previous day in some time zones.
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "2026-10" → "October 2026" */
export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Date → "YYYY-MM-DD" in the phone's local time zone. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
