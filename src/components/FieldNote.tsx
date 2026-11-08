import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import type { CategoryNote } from '@/types/transaction';

type FieldNoteProps = {
  note: CategoryNote;
  onAction?: (value: string) => void;
};

/** A line under a field explaining an automatic choice, with a one-tap action such as Undo. */
export function FieldNote({ note, onAction }: FieldNoteProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.note}>
      <Text style={styles.text}>{note.text}</Text>
      {note.actionLabel && (
        <Pressable accessibilityRole="button" onPress={() => onAction?.(note.value)} hitSlop={spacing.sm}>
          <Text style={styles.action}>{note.actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    text: {
      ...typography.meta,
      flex: 1,
      color: colors.textMuted,
    },
    action: {
      ...typography.meta,
      fontFamily: fonts.semiBold,
      color: colors.accent,
    },
  });
