import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, onPress, disabled = false, variant = 'primary' }: ButtonProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'danger' && styles.danger,
        variant === 'secondary' && styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.title, variant === 'secondary' && styles.secondaryTitle]}>{title}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: 15,
      alignItems: 'center',
    },
    danger: {
      backgroundColor: colors.expenseFill,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.4,
    },
    title: {
      ...typography.button,
      color: colors.onPrimary,
    },
    secondaryTitle: {
      color: colors.accent,
    },
  });
