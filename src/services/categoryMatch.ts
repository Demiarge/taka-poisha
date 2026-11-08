import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initLlama } from 'llama.rn';

import { CATEGORY_HINTS, EMBED_MODEL_FILE, UNCATEGORISED } from '@/constants/model';
import type { TransactionType } from '@/types/transaction';
import { spellingSimilarity } from '@/utils/spelling';

/** `lead` is how far the best category is ahead of the runner-up. */
export type Match = { name: string; score: number; lead: number };
export type PastMatch = { item: string; category: string; score: number };

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return dot / Math.sqrt(aa * bb);
}

// A category's blob holds the vectors for its name and its hidden extra words, one after another.
function toBlob(vectors: Float32Array[]): Uint8Array {
  const all = new Float32Array(vectors.reduce((n, v) => n + v.length, 0));
  vectors.forEach((v, i) => all.set(v, i * v.length));
  return new Uint8Array(all.buffer);
}

function fromBlob(blob: Uint8Array, size: number): Float32Array[] {
  // Copied so the floats start on an aligned offset.
  const all = new Float32Array(blob.slice().buffer);
  return Array.from({ length: all.length / size }, (_, i) => all.subarray(i * size, (i + 1) * size));
}

/**
 * The closest category of the same type by meaning, using MiniLM. Loads and unloads the model each time,
 * so only one model is in memory. Category vectors are saved in the database after the first time.
 */
export async function closestCategory(db: SQLiteDatabase, type: TransactionType, name: string): Promise<Match | null> {
  const file = new File(Paths.document, EMBED_MODEL_FILE);
  if (!file.exists || !name.trim()) {
    return null;
  }
  const rows = await db.getAllAsync<{ id: number; name: string; embedding: Uint8Array | null }>(
    'SELECT id, name, embedding FROM categories WHERE type = ? AND name <> ?',
    type,
    UNCATEGORISED,
  );
  if (rows.length === 0) {
    return null;
  }

  const context = await initLlama({ model: file.uri, embedding: true, n_ctx: 512, n_parallel: 1, n_gpu_layers: 0 });
  try {
    const embed = async (text: string) => Float32Array.from((await context.embedding(text)).embedding);
    const target = await embed(name.trim());
    const scored: { name: string; score: number }[] = [];
    for (const row of rows) {
      const words = [row.name, ...(CATEGORY_HINTS[type][row.name.toLowerCase()] ?? [])];
      // Missing, made by a different model, or the extra words changed: work them out again and save them.
      const saved = row.embedding?.length === words.length * target.length * 4;
      let vectors = saved ? fromBlob(row.embedding!, target.length) : [];
      if (!saved) {
        for (const word of words) vectors.push(await embed(word));
        await db.runAsync('UPDATE categories SET embedding = ? WHERE id = ?', toBlob(vectors), row.id);
      }
      scored.push({ name: row.name, score: Math.max(...vectors.map((v) => cosine(target, v))) });
    }
    scored.sort((a, b) => b.score - a.score);
    const [best, second] = scored;
    return { ...best, lead: best.score - (second?.score ?? 0) };
  } finally {
    await context.release();
  }
}

/** The most similar past item of the same type: an exact match first, then spelling. No model needed. */
export async function findPastItem(db: SQLiteDatabase, type: TransactionType, item: string): Promise<PastMatch | null> {
  const wanted = item.trim().toLowerCase();
  if (!wanted) {
    return null;
  }
  // Newest first, so the latest choice wins a tie.
  const rows = await db.getAllAsync<{ item: string; category: string }>(
    `SELECT t.item, c.name AS category
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = ? AND c.name <> ?
     ORDER BY t.id DESC
     LIMIT 2000`,
    type,
    UNCATEGORISED,
  );
  const exact = rows.find((row) => row.item.trim().toLowerCase() === wanted);
  if (exact) {
    return { ...exact, score: 1 };
  }
  let best: PastMatch | null = null;
  for (const row of rows) {
    const score = spellingSimilarity(wanted, row.item);
    if (!best || score > best.score) {
      best = { ...row, score };
    }
  }
  return best;
}
