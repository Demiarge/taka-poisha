import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ColourArea } from '@/components/ColourArea';
import {
  CATEGORY_COLOURS,
  fonts,
  radius,
  resolveColour,
  spacing,
  typography,
  type SavedColour,
  type ThemeColors,
} from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { hardToSeeIn, hexToRgb, hsvToHex, parseHex, rgbToHsv, type Hsv } from '@/utils/colour';

type OtherCategory = { name: string; colour: SavedColour };

type ColourPickerProps = {
  /** The category being changed; null hides the sheet. */
  category: string | null;
  value: SavedColour | null;
  /** The other categories of the same type, for the "also used by" hint. */
  others: OtherCategory[];
  onPick: (colour: SavedColour) => void;
  onClose: () => void;
};

/** A bottom sheet of palette swatches, with a custom colour picker below. */
export function ColourPicker({ category, value, others, onPick, onClose }: ColourPickerProps) {
  return (
    <BottomSheet visible={category !== null} onClose={onClose}>
      {/* Keyed so each category starts from its own colour. */}
      {category !== null && (
        <Content key={category} category={category} value={value} others={others} onPick={onPick} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function Content({ category, value, others, onPick, onClose }: ColourPickerProps & { category: string }) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const start = resolveColour(value ?? CATEGORY_COLOURS[0], colors).toUpperCase();
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(start)));
  const [text, setText] = useState(start);
  const custom = parseHex(text);

  // Dragging rewrites the text; valid typing moves the picker.
  function drag(next: Hsv) {
    setHsv(next);
    setText(hsvToHex(next));
  }

  function type(next: string) {
    setText(next);
    const hex = parseHex(next);
    if (hex) {
      setHsv((previous) => rgbToHsv(hexToRgb(hex), previous.h));
    }
  }

  const hardThemes = custom ? hardToSeeIn(custom) : [];
  const sharedWith = custom
    ? others.filter((other) => resolveColour(other.colour, colors).toUpperCase() === custom).map((other) => other.name)
    : [];

  return (
    <>
      <Text style={styles.title} numberOfLines={1}>
        Colour for {category}
      </Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {CATEGORY_COLOURS.map((colour) => {
          const selected = colour === value;
          return (
            <Pressable
              key={colour}
              accessibilityRole="radio"
              accessibilityLabel={colour}
              accessibilityState={{ checked: selected }}
              onPress={() => onPick(colour)}
              style={styles.cell}
            >
              <View style={[styles.outline, selected && { borderColor: colors.chart[colour] }]}>
                <View style={[styles.swatch, { backgroundColor: colors.chart[colour] }]}>
                  {selected && <Ionicons name="checkmark" size={22} color={colors.surface} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Custom colour</Text>
      <ColourArea hsv={hsv} onChange={drag} />
      <View style={styles.hexRow}>
        <View
          style={[styles.preview, { backgroundColor: custom ?? colors.surface }]}
          accessible
          accessibilityLabel={custom ? `Preview ${custom}` : 'No valid colour'}
        />
        <TextInput
          style={styles.hexInput}
          value={text}
          onChangeText={type}
          maxLength={7}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Hex colour code"
          placeholder="#RRGGBB"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
        />
      </View>
      <View style={styles.notes}>
        {!custom && <Text style={styles.error}>Use #RGB or #RRGGBB</Text>}
        {hardThemes.length > 0 && (
          <Text style={styles.warning}>
            {hardThemes.length === 2 ? 'Hard to see in both themes' : `Hard to see in ${hardThemes[0]} mode`}
          </Text>
        )}
        {sharedWith.length > 0 && (
          <Text style={styles.hint} numberOfLines={1}>
            Also used by {sharedWith.slice(0, 2).join(', ')}
            {sharedWith.length > 2 ? ` and ${sharedWith.length - 2} more` : ''}
          </Text>
        )}
      </View>

      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
        </View>
        <View style={styles.button}>
          <Button title="Use colour" disabled={!custom} onPress={() => custom && onPick(custom)} />
        </View>
      </View>
    </>
  );
}

const SWATCH = 40;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...typography.subsection,
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.sm,
    },
    // 5 per row.
    cell: {
      width: '20%',
      alignItems: 'center',
    },
    // Always 2px wide, so picking a colour doesn't move the swatch.
    outline: {
      padding: 3,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatch: {
      width: SWATCH,
      height: SWATCH,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.meta,
      color: colors.textMuted,
    },
    hexRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    preview: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hexInput: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      color: colors.text,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
    },
    // Fixed height, so notes appearing don't make the sheet jump.
    notes: {
      minHeight: 36,
      gap: 2,
    },
    error: {
      ...typography.label,
      color: colors.expense,
    },
    warning: {
      ...typography.label,
      color: colors.warning,
    },
    hint: {
      ...typography.label,
      color: colors.textMuted,
    },
    buttons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    button: {
      flex: 1,
    },
  });
