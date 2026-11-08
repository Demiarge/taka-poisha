import { UNCATEGORISED, type CategoryLists } from '@/constants/model';
import { hasCategory as inList } from '@/db/categories';
import { loadModel, runModel } from '@/services/model';
import type { ParsedTransaction, TransactionType } from '@/types/transaction';
import { removeDateWords, resolveDate } from '@/utils/relativeDate';

/** How long the model may take to answer before the keyword reader takes over. */
const MODEL_TIMEOUT_MS = 30_000;

const INCOME_WORDS = /\b(got|received|earned|salary|bonus|income)\b/i;
const FILLER_WORDS = /\b(spent|spend|paid|pay|bought|got|received|earned|on|for|from|taka|tk)\b/gi;
const OTHER_CURRENCY = /(\$|€|£|₹|\b(usd|dollars?|eur|euros?|gbp|pounds?|inr|rupees?|rs|sar|riyals?|aed|dirhams?)\b)/i;

export type ReadResult = ParsedTransaction & {
  readBy: 'model' | 'keywords';
  /** Set when the text mentions a currency other than taka; the app only totals taka for now. */
  otherCurrency: string | null;
  /** True when the user picked a type and the model read the other one. */
  typeOverridden: boolean;
};

type ModelAnswer = {
  type: TransactionType;
  amount: number | null;
  currency: string;
  item: string;
  shop: string | null;
  date: string | null;
  category: string;
};

function cleanText(value: string | null): string | null {
  return value?.trim() || null;
}

async function readWithModel(text: string, categories: CategoryLists): Promise<ModelAnswer> {
  const context = await loadModel();
  try {
    const timer = setTimeout(() => void context.stopCompletion(), MODEL_TIMEOUT_MS);
    const { answer, result } = await runModel(context, text, categories).finally(() => clearTimeout(timer));
    if (result.interrupted) {
      throw new Error(`No answer within ${MODEL_TIMEOUT_MS / 1000} s`);
    }
    return JSON.parse(answer) as ModelAnswer;
  } finally {
    await context.release();
  }
}

/** The old keyword reader, kept as a backup so the form isn't empty when the model fails. */
function readWithKeywords(text: string): ModelAnswer {
  // Without date words, "3 din age 30000 salary" doesn't give 3 as the amount.
  const words = removeDateWords(text);
  const amountMatch = words.match(/\d[\d,]*(\.\d+)?/);
  const item = words
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
    category: UNCATEGORISED,
  };
}

/**
 * Reads a transaction from free text. Never throws: falls back to the keyword reader.
 * A type the user picked always wins over the model's.
 */
export async function parseTransaction(
  text: string,
  categories: CategoryLists,
  pickedType?: TransactionType,
): Promise<ReadResult> {
  let answer: ModelAnswer;
  let readBy: ReadResult['readBy'] = 'model';
  try {
    answer = await readWithModel(text, categories);
  } catch (error) {
    console.warn('Model could not read the text, using keywords instead:', error);
    answer = readWithKeywords(text);
    readBy = 'keywords';
  }

  const type = pickedType ?? answer.type;
  const typeOverridden = pickedType !== undefined && answer.type !== pickedType;
  let category = cleanText(answer.category) ?? UNCATEGORISED;
  // The model picked a category for the other type: keep it only if both types have it, like Family.
  if (typeOverridden && !(inList(categories.expense, category) && inList(categories.income, category))) {
    category = '';
  }
  const currency = answer.currency.toUpperCase();
  const mentioned = text.match(OTHER_CURRENCY)?.[0];

  return {
    type,
    amount: answer.amount,
    currency,
    // The date was worked out from the original text, so date words can go from the item.
    item: removeDateWords(cleanText(answer.item) ?? ''),
    shop: cleanText(answer.shop),
    date: resolveDate(answer.date, text),
    category,
    // Worked out here: the model's own flag isn't trusted.
    isNewCategory: category !== '' && category !== UNCATEGORISED && !inList(categories[type], category),
    readBy,
    otherCurrency: currency !== 'BDT' ? currency : (mentioned ?? null),
    typeOverridden: typeOverridden && readBy === 'model',
  };
}
