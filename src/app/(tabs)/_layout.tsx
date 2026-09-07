import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Returns a tab bar icon renderer for the given Ionicons glyph. */
function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    // React Native's ColorValue also allows null and numbers, which the icon
    // types reject. Our tab colours come from the theme, so they're strings.
    <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerTitle: 'Taka Poisha', tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('time-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
