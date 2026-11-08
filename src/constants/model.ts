// Prompt, grammar and settings copy the Colab tests (training/run6/report.txt), so phone answers stay comparable.
import type { TransactionType } from '@/types/transaction';

export const MODEL_FILE = 'taka-poisha-gemma-270m-q5-mix.gguf';

export type CategoryLists = { expense: string[]; income: string[] };

export const STARTER_CATEGORIES: CategoryLists = {
  expense: ['Eating out', 'Transport', 'Groceries', 'Bills', 'Electronics', 'Clothes', 'Family'],
  income: ['Salary', 'Freelance', 'Family'],
};

/** No `<bos>` here: llama.rn adds the start token itself, as llama-server did on Colab. */
export function buildPrompt(text: string, categories: CategoryLists = STARTER_CATEGORIES): string {
  return (
    '<start_of_turn>user\n' +
    'Extract the money transaction as JSON.\n' +
    `Expense categories: ${categories.expense.join(', ')}\n` +
    `Income categories: ${categories.income.join(', ')}\n` +
    `Text: ${text}<end_of_turn>\n` +
    '<start_of_turn>model\n'
  );
}

export const CONTEXT_SETTINGS = {
  n_ctx: 1024,
  // llama.rn defaults to 8 slots; Colab ran one (-np 1).
  n_parallel: 1,
  n_gpu_layers: 0,
  use_mlock: false,
  use_mmap: true,
};

export const COMPLETION_SETTINGS = {
  n_predict: 128,
  temperature: 0,
  penalty_repeat: 1.0,
  seed: 3407,
  stop: ['<end_of_turn>', '<|im_end|>'],
};

export const UNCATEGORISED = 'Uncategorised';

/** MiniLM, for matching category names (training/embed-test/report.txt). Apache-2.0. */
export const EMBED_MODEL_FILE = 'all-MiniLM-L6-v2-Q8_0.gguf';

// From the phone tests in training/embed-test: switching also needs a clear lead over the runner-up.
export const CATEGORY_MATCH = { auto: 0.5, lead: 0.15, suggest: 0.45 };
export const PAST_ITEM_MATCH = { auto: 0.4, suggest: 0.3 };

/** Extra words for matching starter categories, never shown. Keep in step with rank_test.py. */
export const CATEGORY_HINTS: Record<TransactionType, Record<string, string[]>> = {
  expense: {
    // Not "food": too general, it pulled Health and Entertainment towards Eating out.
    'eating out': ['restaurant', 'meal'],
    bills: ['utilities', 'electricity'],
    transport: ['fuel', 'commute'],
    groceries: ['bazar'],
  },
  income: {
    freelance: ['side income'],
  },
};

/** Most categories of each type sent in the prompt, so it stays short. */
export const MAX_PROMPT_CATEGORIES = { expense: 12, income: 8 };

export const JSON_GRAMMAR = String.raw`root ::= "{\"type\":" kind ",\"amount\":" amount ",\"currency\":" currency ",\"item\":" text ",\"shop\":" (text | "null") ",\"date\":" date ",\"category\":" text ",\"is_new_category\":" flag "}"
kind ::= "\"income\"" | "\"expense\""
amount ::= "null" | [1-9] [0-9]* fraction? | "0" fraction
fraction ::= "." [0-9]+
currency ::= "\"" [A-Z] [A-Z] [A-Z] "\""
text ::= "\"" [^"\\\x00-\x1F]+ "\""
date ::= "null" | "\"" [0-9] [0-9] [0-9] [0-9] "-" [0-9] [0-9] "-" [0-9] [0-9] "\""
flag ::= "true" | "false"`;
