import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** The picked segment's background. Needs to be dark enough for white text. */
  fill: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/** A row of options where exactly one can be picked. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.control} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && { backgroundColor: option.fill }]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    control: {
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
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textMuted,
    },
    selectedLabel: {
      color: colors.onPrimary,
    },
  });
