import type { ParsedTransaction } from '@/types/transaction';

const INCOME_WORDS = /\b(got|received|earned|salary|bonus|income)\b/i;
const FILLER_WORDS = /\b(spent|spend|paid|pay|bought|got|received|earned|on|for|from|taka|tk)\b/gi;

/** Keyword-based placeholder until the on-device model is added. */
export async function parseTransaction(text: string): Promise<ParsedTransaction> {
  const amountMatch = text.match(/\d[\d,]*(\.\d+)?/);
  const item = text
    .replace(amountMatch?.[0] ?? '', '')
    .replace(FILLER_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    type: INCOME_WORDS.test(text) ? 'income' : 'expense',
    amount: amountMatch ? Number(amountMatch[0].replace(/,/g, '')) : null,
    currency: 'BDT',
    item,
    shop: null,
    date: null,
    category: 'Uncategorised',
    isNewCategory: false,
  };
}
