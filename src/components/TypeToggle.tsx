import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { TransactionType } from '@/types/transaction';

const OPTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
];

type TypeToggleProps = {
  /** null means neither option is picked yet. */
  value: TransactionType | null;
  onChange: (type: TransactionType) => void;
};

/** Expense / Income switch. The picked side takes that type's colour. */
export function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {OPTIONS.map(({ type, label }) => {
        const selected = value === type;
        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(type)}
            style={[styles.option, selected && { backgroundColor: colors[type] }]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  selectedLabel: {
    color: colors.onPrimary,
  },
});
