import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useColors } from '@/hooks/useTheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    // ColorValue can be null or a number, which the icon types reject. Theme colours are strings.
    return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />;
  };
}

export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerTitle: 'Taka Poisha', tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('time-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
