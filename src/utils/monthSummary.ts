import type { MonthSummary, Transaction } from '@/types/transaction';

/** Adds up income and expenses for one calendar month. `month` is "YYYY-MM". */
export function summariseMonth(transactions: Transaction[], month: string): MonthSummary {
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(month)) {
      continue;
    }
    if (transaction.type === 'income') {
      income += transaction.amount;
    } else {
      expenses += transaction.amount;
    }
  }

  return { income, expenses, remaining: income - expenses };
}
