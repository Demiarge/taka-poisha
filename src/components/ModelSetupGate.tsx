import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles, useThemePreference } from '@/hooks/useTheme';
import { modelsNeedSetup, NotEnoughSpaceError, setUpModels } from '@/services/bundledModels';

type SetupState =
  | { status: 'ready' }
  | { status: 'copying'; progress: number | null }
  | { status: 'error'; title: string; message: string };

const MB = 1024 * 1024;

function toMb(bytes: number): string {
  return `${Math.ceil(bytes / MB)} MB`;
}

function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof NotEnoughSpaceError) {
    return {
      title: 'Not enough space',
      message: `Taka Poisha needs ${toMb(error.neededBytes)} free to finish setting up. Your phone has ${toMb(error.freeBytes)} free. Free up ${toMb(error.neededBytes - error.freeBytes)} and try again.`,
    };
  }
  return {
    title: 'Setup failed',
    message: 'Taka Poisha could not finish setting up. Make sure your phone has about 210 MB free, then try again.',
  };
}

/** Copies the bundled models out of the app on first launch; renders children straight away after that. */
export function ModelSetupGate({ children }: { children: ReactNode }) {
  const [neededAtStart] = useState(modelsNeedSetup);
  const [state, setState] = useState<SetupState>(
    neededAtStart ? { status: 'copying', progress: null } : { status: 'ready' },
  );

  const start = useCallback(() => {
    setUpModels((progress) => setState({ status: 'copying', progress }))
      .then(() => setState({ status: 'ready' }))
      .catch((error: unknown) => setState({ status: 'error', ...describeError(error) }));
  }, []);

  useEffect(() => {
    if (neededAtStart) {
      start();
    }
  }, [neededAtStart, start]);

  function retry() {
    setState({ status: 'copying', progress: null });
    start();
  }

  if (state.status === 'ready') {
    return children;
  }
  return <SetupScreen state={state} onRetry={retry} />;
}

function SetupScreen({ state, onRetry }: { state: Exclude<SetupState, { status: 'ready' }>; onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useThemePreference();
  const percent = state.status === 'copying' && state.progress !== null ? Math.floor(state.progress * 100) : null;

  return (
    <View style={styles.screen}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
      <Text style={styles.appName}>Taka Poisha</Text>

      {state.status === 'copying' ? (
        <View style={styles.block} accessibilityLiveRegion="polite">
          <Text style={styles.title}>Setting up Taka Poisha…</Text>
          <Text style={styles.body}>This only happens once.</Text>
          {percent === null ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <View style={styles.progress}>
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: percent }}
              >
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.percent}>{percent}%</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.title}>{state.title}</Text>
          <Text style={styles.body}>{state.message}</Text>
          <View style={styles.button}>
            <Button title="Retry" onPress={onRetry} />
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.gutter,
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    icon: {
      width: 88,
      height: 88,
      borderRadius: radius.lg,
    },
    appName: {
      ...typography.subsection,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    block: {
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: {
      ...typography.item,
      color: colors.text,
      textAlign: 'center',
    },
    body: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    progress: {
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: spacing.sm,
    },
    track: {
      alignSelf: 'stretch',
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.surfacePressed,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    percent: {
      ...typography.meta,
      fontVariant: ['tabular-nums'],
      color: colors.textMuted,
    },
    button: {
      alignSelf: 'stretch',
    },
  });
