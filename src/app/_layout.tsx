import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';

/**
 * Root navigator: a stack with the tab bar at the bottom of it. Add
 * Transaction and Confirm are pushed on top of the tabs, so they get a back
 * button and hide the tab bar while the user is entering a transaction.
 */
export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerTintColor: colors.primary }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-transaction" options={{ title: 'Add transaction' }} />
        <Stack.Screen name="confirm" options={{ title: 'Confirm' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
