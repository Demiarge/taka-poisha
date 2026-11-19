import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { exportToExcel } from '@/services/excelFiles';
import type { ExportRange } from '@/utils/excel';
import { formatDate, formatMonth, toIsoDate } from '@/utils/format';
import { shiftMonth } from '@/utils/pieSlices';

type Kind = ExportRange['kind'];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'month', label: 'Month' },
  { value: 'range', label: 'Date range' },
];

type ExportSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/** Picks what to export, then saves the file and opens the share sheet. */
export function ExportSheet({ visible, onClose }: ExportSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Mounted only while open, so each open starts fresh. */}
      {visible && <Content onClose={onClose} />}
    </BottomSheet>
  );
}

function Content({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const today = toIsoDate(new Date());
  const currentMonth = today.slice(0, 7);
  const [kind, setKind] = useState<Kind>('all');
  const [month, setMonth] = useState(currentMonth);
  const [earliestMonth, setEarliestMonth] = useState(currentMonth);
  const [from, setFrom] = useState(`${currentMonth}-01`);
  const [to, setTo] = useState(today);
  const [editing, setEditing] = useState<'from' | 'to'>('from');
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    db.getFirstAsync<{ first: string | null }>('SELECT MIN(date) AS first FROM transactions')
      .then((row) => {
        if (row?.first && row.first.slice(0, 7) < currentMonth) {
          setEarliestMonth(row.first.slice(0, 7));
        }
      })
      .catch(() => {
        // The month arrows then stop at this month; All and Dates still work.
      });
  }, [db, currentMonth]);

  // Picking From moves on to To; an end before the start pulls the other end along.
  function pick(date: string) {
    setNotice(null);
    if (editing === 'from') {
      setFrom(date);
      if (date > to) {
        setTo(date);
      }
      setEditing('to');
    } else {
      setTo(date);
      if (date < from) {
        setFrom(date);
      }
    }
  }

  function edit(end: 'from' | 'to') {
    setEditing(end);
    setCalendarMonth((end === 'from' ? from : to).slice(0, 7));
  }

  async function handleExport() {
    const range: ExportRange =
      kind === 'all' ? { kind } : kind === 'month' ? { kind, month } : { kind, from, to };
    setIsBusy(true);
    setNotice(null);
    try {
      if (await exportToExcel(db, range)) {
        onClose();
      } else {
        setNotice('Nothing to export in this range.');
      }
    } catch (error) {
      Alert.alert('Could not export', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  const canGoBack = month > earliestMonth;
  const canGoForward = month < currentMonth;

  return (
    <>
      <Text style={styles.title}>Export to Excel</Text>
      <SegmentedControl
        options={KINDS.map((option) => ({ ...option, fill: colors.primary }))}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setNotice(null);
        }}
      />

      {kind === 'all' && <Text style={styles.body}>Every transaction, one sheet per month, with a summary.</Text>}

      {kind === 'month' && (
        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            disabled={!canGoBack}
            hitSlop={8}
            onPress={() => {
              setMonth(shiftMonth(month, -1));
              setNotice(null);
            }}
            style={styles.arrow}
          >
            <Ionicons name="chevron-back" size={22} color={canGoBack ? colors.accent : colors.border} />
          </Pressable>
          <Text style={styles.monthLabel} accessibilityRole="header">
            {formatMonth(month)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!canGoForward}
            hitSlop={8}
            onPress={() => {
              setMonth(shiftMonth(month, 1));
              setNotice(null);
            }}
            style={styles.arrow}
          >
            <Ionicons name="chevron-forward" size={22} color={canGoForward ? colors.accent : colors.border} />
          </Pressable>
        </View>
      )}

      {kind === 'range' && (
        <>
          <View style={styles.ends}>
            {(['from', 'to'] as const).map((end) => {
              const selected = editing === end;
              return (
                <Pressable
                  key={end}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => edit(end)}
                  style={[styles.end, selected && styles.endOn]}
                >
                  <Text style={styles.endLabel}>{end === 'from' ? 'From' : 'To'}</Text>
                  <Text style={styles.endValue}>{formatDate(end === 'from' ? from : to)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Calendar month={calendarMonth} onMonthChange={setCalendarMonth} from={from} to={to} max={today} onPick={pick} />
        </>
      )}

      {notice && <Text style={styles.notice}>{notice}</Text>}
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
        </View>
        <View style={styles.button}>
          <Button title={isBusy ? 'Exporting…' : 'Export'} disabled={isBusy} onPress={handleExport} />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...typography.subsection,
      color: colors.text,
    },
    body: {
      ...typography.body,
      color: colors.textMuted,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    arrow: {
      padding: spacing.xs,
    },
    monthLabel: {
      ...typography.item,
      flex: 1,
      textAlign: 'center',
      color: colors.text,
    },
    ends: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    end: {
      flex: 1,
      gap: 2,
      padding: spacing.sm + spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Same width border either way, so picking doesn't shift the layout.
    endOn: {
      borderColor: colors.accent,
    },
    endLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    endValue: {
      ...typography.item,
      color: colors.text,
    },
    notice: {
      ...typography.meta,
      color: colors.warning,
    },
    buttons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    button: {
      flex: 1,
    },
  });
