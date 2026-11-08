import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { hasCategory } from '@/db/categories';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import type { TransactionType } from '@/types/transaction';

type CategoryChipsProps = {
  names: string[];
  value: string;
  type: TransactionType;
  onChange: (name: string) => void;
};

/** One scrolling row, so any number of categories stays one line tall. A name not in the list shows first, marked New. */
export function CategoryChips({ names, value, type, onChange }: CategoryChipsProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const current = value.trim();
  const isNew = current !== '' && !hasCategory(names, current);
  const chips = isNew ? [current, ...names] : names;
  const fill = type === 'income' ? colors.incomeFill : colors.expenseFill;

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroller}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
      >
        {chips.map((name) => {
          const selected = name.toLowerCase() === current.toLowerCase();
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              // Tapping the picked chip again clears it.
              onPress={() => onChange(selected ? '' : name)}
              style={[styles.chip, selected && { backgroundColor: fill, borderColor: fill }]}
            >
              <Text style={[styles.label, selected && styles.selectedLabel]}>
                {isNew && name === current ? `${name} · New` : name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {isNew && <Text style={styles.hint}>New category, created when you save</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.xs,
    },
    // Runs to the screen edges, so chips scroll under the gutter instead of being cut off inside it.
    scroller: {
      marginHorizontal: -spacing.gutter,
    },
    row: {
      gap: spacing.sm,
      paddingHorizontal: spacing.gutter,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    label: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
    },
    selectedLabel: {
      color: colors.onPrimary,
    },
    hint: {
      ...typography.meta,
      color: colors.textMuted,
    },
  });
