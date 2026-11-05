import * as SystemUI from 'expo-system-ui';
import Storage from 'expo-sqlite/kv-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  const stored = Storage.getItemSync(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Holds the user's theme choice and remembers it between launches. */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Read synchronously so the first frame already uses the right theme.
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  // Stops white flashing behind screens during transitions in the dark theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? darkColors.background : lightColors.background);
  }, [isDark]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    Storage.setItemSync(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ preference, setPreference, isDark }), [preference, setPreference, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }
  return value;
}

/** The palette for the active theme. */
export function useColors(): ThemeColors {
  return useThemePreference().isDark ? darkColors : lightColors;
}

/** Builds styles from the active palette. Define `create` outside the component. */
export function useThemedStyles<T>(create: (colors: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => create(colors), [colors, create]);
}
