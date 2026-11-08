import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles, useThemePreference, type ThemePreference } from '@/hooks/useTheme';
import { getApiSettings, isApiReady, type ApiSettings } from '@/services/apiSettings';

// Placeholder values until the real settings exist.
const SETTINGS = [
  { label: 'Currency', value: 'BDT (৳)' },
  { label: 'AI model', value: 'Not downloaded' },
  { label: 'App version', value: Constants.expoConfig?.version ?? 'Unknown' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function apiSummary(settings: ApiSettings | null): string {
  if (!settings || !isApiReady(settings)) {
    return 'Not set';
  }
  return `${settings.name || settings.model}, key ends in ${settings.keyEnding}`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useThemePreference();
  const router = useRouter();
  const [api, setApi] = useState<ApiSettings | null>(null);

  // Refreshed on return from the API screen.
  useFocusEffect(
    useCallback(() => {
      getApiSettings().then(setApi).catch(() => setApi(null));
    }, []),
  );

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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>API</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/api-settings')}
          style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.label}>Receipt reader</Text>
          <Text style={[styles.value, styles.shrink]} numberOfLines={1}>
            {apiSummary(api)}
          </Text>
        </Pressable>
      </View>

      {__DEV__ && <Button title="Model test (development)" onPress={() => router.push('/model-test')} />}
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
      gap: spacing.md,
      padding: spacing.md,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    label: {
      ...typography.body,
      color: colors.text,
    },
    value: {
      ...typography.body,
      color: colors.textMuted,
    },
    shrink: {
      flexShrink: 1,
    },
  });
