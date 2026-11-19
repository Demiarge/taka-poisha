import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  APP_SOURCE,
  GEMMA_LINKS,
  GEMMA_MODIFIED,
  GEMMA_NOTICE,
  GEMMA_USE_RESTRICTION,
  LICENCES,
  type Licence,
} from '@/constants/licences';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <Pressable accessibilityRole="link" onPress={() => openLink(url)} style={styles.link} hitSlop={8}>
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="open-outline" size={16} color={colors.accent} />
    </Pressable>
  );
}

function LicenceCard({ licence }: { licence: Licence }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
      >
        <View style={styles.shrink}>
          <Text style={styles.name}>{licence.name}</Text>
          <Text style={styles.meta}>
            {licence.licence} · {licence.use}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open && (
        <View style={styles.cardBody}>
          {licence.copyright && <Text style={styles.body}>{licence.copyright}</Text>}
          <LinkRow label={licence.url.replace(/^https:\/\//, '')} url={licence.url} />
          {licence.text ? (
            <Text style={styles.licenceText}>{licence.text}</Text>
          ) : (
            <Text style={styles.meta}>Used under these terms; no notice text is required.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function LicencesScreen() {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.body}>
        Taka Poisha is open source under the MIT License. Source:{' '}
        <Text style={styles.linkText} accessibilityRole="link" onPress={() => openLink(APP_SOURCE.url)}>
          {APP_SOURCE.label}
        </Text>
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AI model</Text>
        <View style={[styles.card, styles.cardBody]}>
          <Text style={styles.name}>Gemma 3 270M IT (modified)</Text>
          <Text style={styles.body}>{GEMMA_NOTICE}</Text>
          <Text style={styles.body}>{GEMMA_MODIFIED}</Text>
          <Text style={styles.body}>{GEMMA_USE_RESTRICTION}</Text>
          {GEMMA_LINKS.map((link) => (
            <LinkRow key={link.url} label={link.label} url={link.url} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Other parts</Text>
        {LICENCES.map((licence) => (
          <LicenceCard key={licence.name} licence={licence} />
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.gutter,
      gap: spacing.lg,
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
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    cardBody: {
      gap: spacing.sm,
      padding: spacing.md,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    shrink: {
      flex: 1,
    },
    name: {
      ...typography.item,
      color: colors.text,
    },
    body: {
      ...typography.body,
      color: colors.text,
    },
    meta: {
      ...typography.meta,
      color: colors.textMuted,
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    linkText: {
      ...typography.item,
      color: colors.accent,
    },
    licenceText: {
      ...typography.label,
      color: colors.textMuted,
    },
  });
