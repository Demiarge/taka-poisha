import type { Transaction } from '@/types/transaction';
import { toIsoDate } from '@/utils/format';

const today = new Date();

/** A day in the current month, capped at today so it's never in the future. */
function thisMonth(day: number): string {
  return toIsoDate(new Date(today.getFullYear(), today.getMonth(), Math.min(day, today.getDate())));
}

function lastMonth(day: number): string {
  return toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, day));
}

/**
 * Fake data for Step 1, newest first. Dates are relative to today so the Home
 * balance always has something to show. Replaced by SQLite in Step 2.
 */
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: 1, type: 'expense', amount: 500, currency: 'BDT', item: 'Biriyani', shop: null, category: 'Eating out', date: thisMonth(28) },
  { id: 2, type: 'expense', amount: 80, currency: 'BDT', item: 'Rickshaw to office', shop: null, category: 'Transport', date: thisMonth(28) },
  { id: 3, type: 'expense', amount: 2350, currency: 'BDT', item: 'Weekly groceries', shop: 'Karwan Bazar', category: 'Groceries', date: thisMonth(26) },
  { id: 4, type: 'income', amount: 5000, currency: 'BDT', item: 'Logo design', shop: null, category: 'Freelance', date: thisMonth(25) },
  { id: 5, type: 'expense', amount: 199, currency: 'BDT', item: 'Mobile recharge', shop: null, category: 'Bills', date: thisMonth(25) },
  { id: 6, type: 'expense', amount: 60, currency: 'BDT', item: 'Tea and singara', shop: null, category: 'Eating out', date: thisMonth(24) },
  { id: 7, type: 'expense', amount: 1450, currency: 'BDT', item: 'Electricity bill', shop: null, category: 'Bills', date: thisMonth(20) },
  { id: 8, type: 'expense', amount: 3200, currency: 'BDT', item: 'Headphones', shop: 'Multiplan Center', category: 'Electronics', date: thisMonth(15) },
  { id: 9, type: 'expense', amount: 350, currency: 'BDT', item: 'CNG to Dhanmondi', shop: null, category: 'Transport', date: thisMonth(12) },
  { id: 10, type: 'income', amount: 2000, currency: 'BDT', item: 'Pocket money', shop: 'Abbu', category: 'Family', date: thisMonth(10) },
  { id: 11, type: 'income', amount: 30000, currency: 'BDT', item: 'Salary', shop: null, category: 'Salary', date: thisMonth(1) },
  { id: 12, type: 'expense', amount: 1200, currency: 'BDT', item: 'Panjabi', shop: 'New Market', category: 'Clothes', date: lastMonth(28) },
  { id: 13, type: 'income', amount: 30000, currency: 'BDT', item: 'Salary', shop: null, category: 'Salary', date: lastMonth(1) },
];
