import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import type { ImportPreview } from '@/services/excelFiles';

/** Bad rows listed at most; the count above still covers all of them. */
const MAX_LISTED = 200;

type ImportPreviewSheetProps = {
  preview: ImportPreview | null;
  isImporting: boolean;
  onImport: () => void;
  onClose: () => void;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** What an import would do, before anything is written. */
export function ImportPreviewSheet({ preview, isImporting, onImport, onClose }: ImportPreviewSheetProps) {
  return (
    <BottomSheet visible={preview !== null} onClose={isImporting ? () => {} : onClose}>
      {preview && <Content preview={preview} isImporting={isImporting} onImport={onImport} onClose={onClose} />}
    </BottomSheet>
  );
}

function Content({ preview, isImporting, onImport, onClose }: ImportPreviewSheetProps & { preview: ImportPreview }) {
  const styles = useThemedStyles(createStyles);
  const [showBad, setShowBad] = useState(false);
  const { plan, bad, skipped } = preview;
  const count = plan.fresh.length;

  return (
    <>
      <Text style={styles.title}>Import from Excel</Text>
      <Text style={styles.summary}>
        {plural(count, 'new', 'new')}, {plural(plan.duplicates, 'duplicate')},{' '}
        {bad.length > 0 ? (
          <Text
            style={styles.link}
            accessibilityRole="button"
            accessibilityHint={showBad ? 'Hides the reasons' : 'Shows why each row was left out'}
            onPress={() => setShowBad((shown) => !shown)}
          >
            {plural(bad.length, 'bad row')} ({showBad ? 'tap to hide' : 'tap to see why'})
          </Text>
        ) : (
          '0 bad rows'
        )}
        .
      </Text>

      {showBad && (
        <ScrollView style={styles.badList} nestedScrollEnabled>
          {bad.slice(0, MAX_LISTED).map((row) => (
            <Text key={`${row.sheet}:${row.row}`} style={styles.badRow}>
              {row.sheet}, row {row.row}: {row.reason}
            </Text>
          ))}
          {bad.length > MAX_LISTED && (
            <Text style={styles.badRow}>and {plural(bad.length - MAX_LISTED, 'more row')}</Text>
          )}
        </ScrollView>
      )}

      {plan.newCategories.length > 0 && (
        <Text style={styles.note} numberOfLines={3}>
          New {plan.newCategories.length === 1 ? 'category' : 'categories'}:{' '}
          {plan.newCategories.map((category) => `${category.name} (${category.type})`).join(', ')}
        </Text>
      )}
      {skipped.length > 0 && (
        <Text style={styles.note} numberOfLines={3}>
          Skipped {skipped.length === 1 ? 'sheet' : 'sheets'}:{' '}
          {skipped.map((sheet) => `${sheet.sheet} (${sheet.reason.toLowerCase()})`).join(', ')}
        </Text>
      )}

      <Text style={styles.question}>{count > 0 ? 'Import?' : 'Nothing new to import.'}</Text>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="Cancel" variant="secondary" disabled={isImporting} onPress={onClose} />
        </View>
        <View style={styles.button}>
          <Button
            title={isImporting ? 'Importing…' : `Import ${count.toLocaleString('en-US')}`}
            disabled={count === 0 || isImporting}
            onPress={onImport}
          />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...typography.subsection,
      color: colors.text,
    },
    summary: {
      ...typography.body,
      color: colors.text,
    },
    link: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    badList: {
      maxHeight: 200,
    },
    badRow: {
      ...typography.meta,
      color: colors.textMuted,
      paddingVertical: 2,
    },
    note: {
      ...typography.meta,
      color: colors.textMuted,
    },
    question: {
      ...typography.item,
      color: colors.text,
    },
    buttons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    button: {
      flex: 1,
    },
  });
