import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';

type FormFieldProps = TextInputProps & {
  label: string;
};

/** A labelled text input. Any extra props go straight to the TextInput. */
export function FormField({ label, style, ...inputProps }: FormFieldProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        {...inputProps}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    label: {
      ...typography.meta,
      color: colors.textMuted,
    },
    input: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
    },
  });
