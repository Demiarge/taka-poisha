export type TransactionType = 'income' | 'expense';

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

/** The parts of a transaction the user can edit. */
export type TransactionFields = Pick<Transaction, 'type' | 'amount' | 'item' | 'shop' | 'category' | 'date'>;

export type TransactionSource = 'text' | 'receipt_local' | 'receipt_gemini';

export type NewTransaction = TransactionFields & {
  currency: string;
  source: TransactionSource;
  rawInput: string | null;
};

/** Mirrors the model's output format. Fields it can't find are null, for the user to fill in. */
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

export type MonthSummary = {
  income: number;
  expenses: number;
  remaining: number;
};
