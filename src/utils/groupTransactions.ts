import type { Transaction, TransactionType } from '@/types/transaction';

export type CategoryGroup = {
  key: string;
  /** "YYYY-MM" */
  month: string;
  category: string;
  type: TransactionType;
  total: number;
  isFirstInMonth: boolean;
  data: Transaction[];
};

/** Groups by month, then category. Expects newest first and keeps that order. */
export function groupTransactions(transactions: Transaction[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  const seenMonths = new Set<string>();

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    // Type is in the key because "Gift" can be both income and an expense.
    const key = `${month}|${transaction.type}|${transaction.category}`;
    const group = groups.get(key);

    if (group) {
      group.total += transaction.amount;
      group.data.push(transaction);
    } else {
      groups.set(key, {
        key,
        month,
        category: transaction.category,
        type: transaction.type,
        total: transaction.amount,
        isFirstInMonth: !seenMonths.has(month),
        data: [transaction],
      });
      seenMonths.add(month);
    }
  }

  return [...groups.values()];
}
