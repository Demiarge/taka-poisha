import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ModelSetupGate } from '@/components/ModelSetupGate';
import { darkColors, fonts, lightColors, type ThemeColors } from '@/constants/theme';
import { migrateDatabase } from '@/db/schema';
import { ThemePreferenceProvider, useColors, useThemePreference } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

const navigationFonts = {
  regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
  medium: { fontFamily: fonts.medium, fontWeight: 'normal' },
  bold: { fontFamily: fonts.bold, fontWeight: 'normal' },
  heavy: { fontFamily: fonts.extraBold, fontWeight: 'normal' },
} as const;

function navigationColors(colors: ThemeColors) {
  return {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  };
}

const lightNavigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, ...navigationColors(lightColors) },
  fonts: navigationFonts,
};

const darkNavigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, ...navigationColors(darkColors) },
  fonts: navigationFonts,
};

function RootNavigator() {
  const { isDark } = useThemePreference();
  const colors = useColors();

  return (
    <ThemeProvider value={isDark ? darkNavigationTheme : lightNavigationTheme}>
      <Stack screenOptions={{ headerTintColor: colors.accent, headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-transaction" options={{ title: 'Add transaction' }} />
        <Stack.Screen name="confirm" options={{ title: 'Confirm' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Edit transaction' }} />
        <Stack.Screen name="model-test" options={{ title: 'Model test' }} />
        <Stack.Screen name="api-settings" options={{ title: 'API' }} />
        <Stack.Screen name="licences" options={{ title: 'Licences' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  // If the fonts fail to load, carry on with the system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemePreferenceProvider>
      <ModelSetupGate>
        <SQLiteProvider databaseName="taka-poisha.db" onInit={migrateDatabase}>
          <RootNavigator />
        </SQLiteProvider>
      </ModelSetupGate>
    </ThemePreferenceProvider>
  );
}
