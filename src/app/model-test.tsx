import { File, Paths } from 'expo-file-system';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { initLlama } from 'llama.rn';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { CategoryLists } from '@/constants/model';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { getModelFile, loadModel, runModel } from '@/services/model';
import { readReceiptPhoto } from '@/services/readReceipt';
import { readTransaction } from '@/services/readTransaction';
import type { TransactionType } from '@/types/transaction';

type ReplayCase = { set: string; index: number; text: string; categories: CategoryLists | null };

/** Runs the saved test sentences pushed by training/run6/phone/run_phone.py and saves the answers. */
async function replayCases(threads: string, show: (line: string) => void) {
  const output = new File(Paths.document, `phone-results-${threads}.json`);
  if (output.exists) output.delete();
  const cases: ReplayCase[] = JSON.parse(await new File(Paths.document, 'phone-cases.json').text());

  const started = Date.now();
  const context = await loadModel(threads === 'auto' ? undefined : Number(threads));
  const loadMs = Date.now() - started;
  const results = [];
  try {
    for (const [n, item] of cases.entries()) {
      show(`Replay ${threads} threads: ${n + 1}/${cases.length}`);
      const caseStarted = Date.now();
      const { answer, result } = await runModel(context, item.text, item.categories ?? undefined);
      results.push({
        set: item.set,
        index: item.index,
        answer,
        ms: Date.now() - caseStarted,
        prompt_n: result.timings.prompt_n,
        prompt_ms: result.timings.prompt_ms,
        predicted_n: result.timings.predicted_n,
        predicted_ms: result.timings.predicted_ms,
      });
    }
  } finally {
    await context.release();
  }
  output.write(JSON.stringify({ threads, loadMs, androidLib: context.androidLib ?? null, results }));
  show(`Replay done: ${results.length} sentences saved`);
}

type EmbedJob = { model: string; prefix: string; texts: string[] };

/** Embeds a list of words with a candidate embedding model, for training/embed-test/embed_test.py. */
async function embedTexts(name: string, show: (line: string) => void) {
  const output = new File(Paths.document, `phone-embed-${name}-results.json`);
  if (output.exists) output.delete();
  const job: EmbedJob = JSON.parse(await new File(Paths.document, `phone-embed-${name}.json`).text());
  const started = Date.now();
  const context = await initLlama({
    model: new File(Paths.document, job.model).uri,
    embedding: true,
    n_ctx: 512,
    n_parallel: 1,
    n_gpu_layers: 0,
    use_mlock: false,
  }).catch((error) => {
    // Saved so the script stops at once instead of waiting.
    output.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    throw error;
  });
  const loadMs = Date.now() - started;
  const results = [];
  try {
    for (const [n, text] of job.texts.entries()) {
      show(`Replay embed ${name}: ${n + 1}/${job.texts.length}`);
      const textStarted = Date.now();
      const { embedding } = await context.embedding(job.prefix + text);
      results.push({ text, ms: Date.now() - textStarted, embedding });
    }
  } finally {
    await context.release();
  }
  output.write(JSON.stringify({ model: job.model, loadMs, results }));
  show(`Replay done: ${results.length} embeddings saved`);
}

/** Reads receipt photos copied into the app by training/receipt-test/check_receipts.py. */
async function checkReceipts(db: SQLiteDatabase, name: string, show: (line: string) => void) {
  const output = new File(Paths.document, `phone-receipts-${name}-results.json`);
  if (output.exists) output.delete();
  const photos: string[] = JSON.parse(await new File(Paths.document, `phone-receipts-${name}.json`).text());
  const results = [];
  for (const [n, photo] of photos.entries()) {
    show(`Replay receipts ${name}: ${n + 1}/${photos.length}`);
    const started = Date.now();
    try {
      const read = await readReceiptPhoto(db, new File(Paths.document, photo).uri);
      results.push({ photo, ms: Date.now() - started, read });
    } catch (error) {
      results.push({ photo, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
    }
  }
  output.write(JSON.stringify({ results }));
  show(`Replay done: ${results.length} receipts saved`);
}

type CheckCase = { text: string; type?: TransactionType };

/** Runs sentences through the same reader as the Add screen, including loading and unloading each time. */
async function checkCases(db: SQLiteDatabase, name: string, show: (line: string) => void) {
  const output = new File(Paths.document, `phone-check-${name}-results.json`);
  if (output.exists) output.delete();
  const cases: CheckCase[] = JSON.parse(await new File(Paths.document, `phone-check-${name}.json`).text());
  const results = [];
  for (const [n, item] of cases.entries()) {
    show(`Replay check ${name}: ${n + 1}/${cases.length}`);
    const started = Date.now();
    const parsed = await readTransaction(db, item.text, item.type);
    results.push({ ...item, ms: Date.now() - started, parsed });
  }
  output.write(JSON.stringify({ results }));
  show(`Replay done: ${results.length} checks saved`);
}

type Threads = 'auto' | '2' | '4' | '6';

const THREAD_OPTIONS: { value: Threads; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
  { value: '6', label: '6' },
];

/** Development-only screen for checking the on-device model. */
export default function ModelTestScreen() {
  const colors = useColors();
  const db = useSQLiteContext();
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState('spent 500 on biriyani');
  const [threads, setThreads] = useState<Threads>('auto');
  const [report, setReport] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { replay, check, embed, receipts } = useLocalSearchParams<{
    replay?: string;
    check?: string;
    embed?: string;
    receipts?: string;
  }>();
  const replayStarted = useRef<string | null>(null);

  // Deep links start a run: takapoisha://model-test?replay=4, ?check=forced or ?embed=minilm.
  useEffect(() => {
    const key = replay
      ? `replay ${replay}`
      : check
        ? `check ${check}`
        : embed
          ? `embed ${embed}`
          : receipts
            ? `receipts ${receipts}`
            : null;
    if (!__DEV__ || !key || replayStarted.current === key) return;
    replayStarted.current = key;
    setIsRunning(true);
    // Progress lines replace each other instead of piling up.
    const show = (line: string) =>
      setReport((lines) => (lines.at(-1)?.startsWith('Replay') ? [...lines.slice(0, -1), line] : [...lines, line]));
    (replay
      ? replayCases(replay, show)
      : check
        ? checkCases(db, check, show)
        : receipts
          ? checkReceipts(db, receipts, show)
          : embedTexts(embed!, show)
    )
      .catch((error) => show(`Error: ${error instanceof Error ? error.message : String(error)}`))
      .finally(() => setIsRunning(false));
  }, [replay, check, embed, receipts, db]);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  async function handleRun() {
    setIsRunning(true);
    const lines: string[] = [];
    const show = (line: string) => {
      lines.push(line);
      setReport([...lines]);
    };
    const file = getModelFile();
    show(`Model file: ${file.exists ? `${((file.size ?? 0) / 1e6).toFixed(1)} MB` : 'missing'}`);

    const started = Date.now();
    let context: Awaited<ReturnType<typeof loadModel>> | null = null;
    try {
      context = await loadModel(threads === 'auto' ? undefined : Number(threads));
      const loadMs = Date.now() - started;
      show(`Loaded in ${loadMs} ms, GPU: ${context.gpu ? 'yes' : `no (${context.reasonNoGPU || 'none'})`}`);
      show(`Library: ${String(context.androidLib ?? 'unknown')}`);

      const { prompt, answer, result } = await runModel(context, text);
      const promptTokens = (await context.tokenize(prompt)).tokens.length;
      const evaluated = result.timings.prompt_n;
      const startToken =
        evaluated === promptTokens + 1 ? 'added once' : `check: prompt ${promptTokens}, evaluated ${evaluated}`;
      show(`Start token: ${startToken}`);
      show(`Answer: ${answer}`);
      show(`Stopped: ${result.stopped_eos ? 'end of text' : result.stopped_word || (result.stopped_limit ? 'token limit' : 'other')}`);
      show(`Prompt: ${evaluated} tokens in ${result.timings.prompt_ms.toFixed(0)} ms`);
      show(
        `Answer: ${result.timings.predicted_n} tokens in ${result.timings.predicted_ms.toFixed(0)} ms (${result.timings.predicted_per_second.toFixed(1)} tokens/s)`,
      );
      show(`Tap to answer: ${Date.now() - started} ms`);
    } catch (error) {
      show(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await context?.release();
      setIsRunning(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FormField label="Sentence" value={text} onChangeText={setText} />
      <View style={styles.section}>
        <Text style={styles.label}>Threads</Text>
        <SegmentedControl
          options={THREAD_OPTIONS.map((option) => ({ ...option, fill: colors.primary }))}
          value={threads}
          onChange={setThreads}
        />
      </View>
      <Button title={isRunning ? 'Running…' : 'Run model'} onPress={handleRun} disabled={isRunning || !text.trim()} />
      {report.length > 0 && (
        <View style={styles.card}>
          {report.map((line, index) => (
            <Text key={index} style={styles.line} selectable>
              {line}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.gutter,
      gap: spacing.md,
    },
    section: {
      gap: spacing.sm,
    },
    label: {
      ...typography.meta,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    line: {
      ...typography.meta,
      color: colors.text,
    },
  });
