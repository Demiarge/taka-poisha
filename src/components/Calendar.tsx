import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { formatDate, formatMonth } from '@/utils/format';
import { shiftMonth } from '@/utils/pieSlices';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type CalendarProps = {
  /** The month shown, "YYYY-MM". */
  month: string;
  onMonthChange: (month: string) => void;
  /** The chosen range, inclusive. Both ends are highlighted and the days between are tinted. */
  from: string;
  to: string;
  /** Days after this can't be picked. */
  max: string;
  onPick: (date: string) => void;
};

/** "YYYY-MM-DD" for each day, with nulls before the 1st so it starts on its weekday. UTC, so no time-zone shifts. */
function monthGrid(month: string): (string | null)[][] {
  const [year, monthNumber] = month.split('-').map(Number);
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** A month of days to pick from, Sunday first. */
export function Calendar({ month, onMonthChange, from, to, max, onPick }: CalendarProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const canGoForward = month < max.slice(0, 7);

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <Text style={styles.month} accessibilityRole="header">
          {formatMonth(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={!canGoForward}
          hitSlop={8}
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          style={styles.arrow}
        >
          <Ionicons name="chevron-forward" size={22} color={canGoForward ? colors.accent : colors.border} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekday} importantForAccessibility="no">
            {day}
          </Text>
        ))}
      </View>
      {monthGrid(month).map((week, index) => (
        <View key={index} style={styles.week}>
          {week.map((date, column) => {
            if (!date) {
              return <View key={column} style={styles.cell} />;
            }
            const disabled = date > max;
            const isEnd = date === from || date === to;
            const isBetween = date > from && date < to;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={formatDate(date)}
                accessibilityState={{ disabled, selected: isEnd }}
                disabled={disabled}
                onPress={() => onPick(date)}
                style={[styles.cell, isBetween && styles.between]}
              >
                <View style={[styles.day, isEnd && styles.end]}>
                  <Text style={[styles.dayLabel, isEnd && styles.endLabel, disabled && styles.disabled]}>
                    {Number(date.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const DAY = 38;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    calendar: {
      gap: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    arrow: {
      padding: spacing.xs,
    },
    month: {
      ...typography.item,
      flex: 1,
      textAlign: 'center',
      color: colors.text,
    },
    week: {
      flexDirection: 'row',
    },
    weekday: {
      ...typography.label,
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      paddingVertical: spacing.xs,
    },
    cell: {
      flex: 1,
      height: DAY,
      alignItems: 'center',
      justifyContent: 'center',
    },
    between: {
      backgroundColor: colors.surfacePressed,
    },
    day: {
      width: DAY,
      height: DAY,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    end: {
      backgroundColor: colors.primary,
    },
    dayLabel: {
      fontFamily: fonts.medium,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    endLabel: {
      color: colors.onPrimary,
    },
    disabled: {
      color: colors.textMuted,
      opacity: 0.4,
    },
  });
