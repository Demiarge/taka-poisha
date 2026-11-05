import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/SegmentedControl';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles, useThemePreference, type ThemePreference } from '@/hooks/useTheme';

// Placeholder values until the real settings exist.
const SETTINGS = [
  { label: 'Currency', value: 'BDT (৳)' },
  { label: 'AI model', value: 'Not downloaded' },
  { label: 'Gemini API key', value: 'Not set' },
  { label: 'App version', value: Constants.expoConfig?.version ?? 'Unknown' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.screen}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Theme</Text>
        <SegmentedControl
          options={THEME_OPTIONS.map((option) => ({ ...option, fill: colors.primary }))}
          value={preference}
          onChange={setPreference}
        />
      </View>

      <View style={styles.card}>
        {SETTINGS.map((setting, index) => (
          <View key={setting.label} style={[styles.row, index > 0 && styles.divider]}>
            <Text style={styles.label}>{setting.label}</Text>
            <Text style={styles.value}>{setting.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: spacing.gutter,
      gap: spacing.lg,
      backgroundColor: colors.background,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      ...typography.meta,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    label: {
      ...typography.body,
      color: colors.text,
    },
    value: {
      ...typography.body,
      color: colors.textMuted,
    },
  });
