export type TransactionType = 'income' | 'expense';

/** A saved transaction, as the screens display it. */
export type Transaction = {
  id: number;
  type: TransactionType;
  /** Always positive: `type` says whether money came in or went out. */
  amount: number;
  /** ISO 4217 code, e.g. "BDT". */
  currency: string;
  item: string;
  /** The shop for an expense, or who paid for income. */
  shop: string | null;
  category: string;
  /** Calendar date as "YYYY-MM-DD". */
  date: string;
};

/**
 * What the parser extracts from the user's text. Mirrors the model output
 * format in PLAN.md. Anything the parser can't find is null, and the user
 * fills it in on the Confirm screen.
 */
export type ParsedTransaction = {
  type: TransactionType;
  amount: number | null;
  currency: string;
  item: string;
  shop: string | null;
  date: string | null;
  category: string;
  isNewCategory: boolean;
};

/** Totals for one calendar month. */
export type MonthSummary = {
  income: number;
  expenses: number;
  /** Income minus expenses; negative when the month is overspent. */
  remaining: number;
};
