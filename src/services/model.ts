import { File, Paths } from 'expo-file-system';
import { initLlama, type LlamaContext } from 'llama.rn';

import {
  buildPrompt,
  COMPLETION_SETTINGS,
  CONTEXT_SETTINGS,
  JSON_GRAMMAR,
  MODEL_FILE,
  type CategoryLists,
} from '@/constants/model';

export function getModelFile(): File {
  return new File(Paths.document, MODEL_FILE);
}

/** Loads the model; the caller must call `release()` on the result when done. */
export async function loadModel(threads?: number): Promise<LlamaContext> {
  const file = getModelFile();
  if (!file.exists) {
    throw new Error(`Model file not found at ${file.uri}`);
  }
  return initLlama({ model: file.uri, ...CONTEXT_SETTINGS, ...(threads ? { n_threads: threads } : {}) });
}

export async function runModel(context: LlamaContext, text: string, categories?: CategoryLists) {
  const prompt = buildPrompt(text, categories);
  const result = await context.completion({ prompt, ...COMPLETION_SETTINGS, grammar: JSON_GRAMMAR });
  // Colab stripped the answer the same way before scoring.
  return { prompt, answer: result.text.trim(), result };
}
