import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { getModelFile, loadModel, runModel } from '@/services/model';

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
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState('spent 500 on biriyani');
  const [threads, setThreads] = useState<Threads>('auto');
  const [report, setReport] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

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
