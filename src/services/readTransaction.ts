import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_MATCH, PAST_ITEM_MATCH, STARTER_CATEGORIES, UNCATEGORISED, type CategoryLists } from '@/constants/model';
import { hasCategory, listPromptCategories } from '@/db/categories';
import { closestCategory, findPastItem } from '@/services/categoryMatch';
import { parseTransaction, type ReadResult } from '@/services/parseTransaction';
import type { CategoryNote, TransactionType } from '@/types/transaction';

export type ReadTransaction = ReadResult & { categoryNote: CategoryNote | null };

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Picks the category: a near-identical past item of the same type wins, then a new name from the AI is switched
 * to an existing category only when the match is clear. A less similar past item is offered as a suggestion.
 */
async function chooseCategory(
  db: SQLiteDatabase,
  read: ReadResult,
  categories: CategoryLists,
): Promise<{ category: string; categoryNote: CategoryNote | null }> {
  const original = read.category;
  const past = await findPastItem(db, read.type, read.item).catch(() => null);

  if (past && past.score >= PAST_ITEM_MATCH.auto) {
    const note = same(past.category, original)
      ? null
      : { text: `Like your earlier “${past.item}” → ${past.category}`, actionLabel: 'Undo', value: original, shownFor: past.category };
    return { category: past.category, categoryNote: note };
  }

  const isNewName = original !== '' && original !== UNCATEGORISED && !hasCategory(categories[read.type], original);
  if (isNewName) {
    const match = await closestCategory(db, read.type, original).catch((error) => {
      console.warn('Category matching failed:', error);
      return null;
    });
    if (match && match.score >= CATEGORY_MATCH.auto && match.lead >= CATEGORY_MATCH.lead) {
      return {
        category: match.name,
        categoryNote: { text: `Matched to ${match.name} (the AI suggested “${original}”)`, actionLabel: 'Undo', value: original, shownFor: match.name },
      };
    }
    // No suggestion below that: the AI invents names when nothing fits, and on the phone all 5 suggestions were wrong.
  }

  if (past && past.score >= PAST_ITEM_MATCH.suggest && !same(past.category, original)) {
    return {
      category: original,
      categoryNote: { text: `Like your earlier “${past.item}”: ${past.category}?`, actionLabel: `Use ${past.category}`, value: past.category, shownFor: original },
    };
  }
  return { category: original, categoryNote: null };
}

/** Everything the Add screen does after Next: categories for the prompt, the model, then the category choice. */
export async function readTransaction(db: SQLiteDatabase, text: string, pickedType?: TransactionType): Promise<ReadTransaction> {
  const categories = await listPromptCategories(db).catch(() => STARTER_CATEGORIES);
  const read = await parseTransaction(text, categories, pickedType);
  const { category, categoryNote } = await chooseCategory(db, read, categories).catch(() => ({
    category: read.category,
    categoryNote: null,
  }));
  return {
    ...read,
    category,
    isNewCategory: category !== '' && category !== UNCATEGORISED && !hasCategory(categories[read.type], category),
    categoryNote,
  };
}
