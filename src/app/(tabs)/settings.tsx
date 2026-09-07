import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

// Placeholder values until the real settings exist.
const SETTINGS = [
  { label: 'Currency', value: 'BDT (৳)' },
  { label: 'AI model', value: 'Not downloaded' },
  { label: 'Gemini API key', value: 'Not set' },
  { label: 'App version', value: Constants.expoConfig?.version ?? 'Unknown' },
];

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
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
    fontSize: 16,
    color: colors.text,
  },
  value: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
