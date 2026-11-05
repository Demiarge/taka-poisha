import { StyleSheet, Text } from 'react-native';

import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';

/** A centred message for when there's nothing to list. */
export function EmptyState({ message }: { message: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.message}>{message}</Text>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    message: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
      padding: spacing.lg,
    },
  });
