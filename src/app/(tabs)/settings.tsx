import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ExportSheet } from '@/components/ExportSheet';
import { ImportPreviewSheet } from '@/components/ImportPreviewSheet';
import { SegmentedControl } from '@/components/SegmentedControl';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { insertImport } from '@/db/excel';
import { useColors, useThemedStyles, useThemePreference, type ThemePreference } from '@/hooks/useTheme';
import { getApiSettings, isApiReady, type ApiSettings } from '@/services/apiSettings';
import { pickImportFile, type ImportPreview } from '@/services/excelFiles';
import { ImportError } from '@/utils/excel';

// Placeholder values until the real settings exist.
const SETTINGS = [
  { label: 'Currency', value: 'BDT (৳)' },
  { label: 'AI model', value: 'Bundled' },
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
  const db = useSQLiteContext();
  const [api, setApi] = useState<ApiSettings | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Refreshed on return from the API screen.
  useFocusEffect(
    useCallback(() => {
      getApiSettings().then(setApi).catch(() => setApi(null));
    }, []),
  );

  async function handlePickImport() {
    setIsReading(true);
    try {
      const result = await pickImportFile(db);
      if (result) {
        setPreview(result);
      }
    } catch (error) {
      Alert.alert(
        'Can’t import this file',
        error instanceof ImportError ? error.message : 'Something went wrong while reading it. Please try again.',
      );
    } finally {
      setIsReading(false);
    }
  }

  async function handleImport() {
    if (!preview) {
      return;
    }
    setIsImporting(true);
    try {
      const count = await insertImport(db, preview.plan);
      setPreview(null);
      Alert.alert('Import done', `${count.toLocaleString('en-US')} ${count === 1 ? 'transaction' : 'transactions'} added.`);
    } catch {
      Alert.alert('Import failed', 'Nothing was imported. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.screen}>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsExportOpen(true)}
            style={({ pressed }) => [styles.row, styles.rowTop, pressed && styles.pressed]}
          >
            <Text style={styles.label}>Export to Excel</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isReading, disabled: isReading }}
            disabled={isReading}
            onPress={handlePickImport}
            style={({ pressed }) => [styles.row, styles.rowBottom, styles.divider, pressed && styles.pressed]}
          >
            <Text style={styles.label}>Import from Excel</Text>
            {isReading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/licences')}
          style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.label}>Licences</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {__DEV__ && <Button title="Model test (development)" onPress={() => router.push('/model-test')} />}

      <ExportSheet visible={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <ImportPreviewSheet
        preview={preview}
        isImporting={isImporting}
        onImport={handleImport}
        onClose={() => setPreview(null)}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      padding: spacing.gutter,
      gap: spacing.lg,
    },
    // The pressed colour follows the card's rounded corners.
    rowTop: {
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    rowBottom: {
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
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
