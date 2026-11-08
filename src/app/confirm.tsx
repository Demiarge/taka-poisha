import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TransactionForm, type TransactionFormValues } from '@/components/TransactionForm';
import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { addTransaction } from '@/db/transactions';
import { useThemedStyles } from '@/hooks/useTheme';
import {
  apiButtonLabel,
  getApiSettings,
  giveApiConsent,
  hasApiConsent,
  isApiReady,
  type ApiSettings,
} from '@/services/apiSettings';
import { readReceiptWithUserApi, type ReceiptRead } from '@/services/readReceipt';
import type { CategoryNote, TransactionFields, TransactionSource } from '@/types/transaction';

type ConfirmParams = {
  type?: string;
  amount?: string;
  item?: string;
  shop?: string;
  date?: string;
  category?: string;
  rawInput?: string;
  readBy?: string;
  otherCurrency?: string;
  typeOverridden?: string;
  categoryNote?: string;
  /** Set for receipts. */
  photoUri?: string;
  amountNote?: string;
  dateNote?: string;
};

/** A receipt shows this many lines until "Show all" is tapped. */
const RECEIPT_PREVIEW_LINES = 6;

function parseNote(json: string | undefined): CategoryNote | null {
  try {
    return json ? (JSON.parse(json) as CategoryNote) : null;
  } catch {
    return null;
  }
}

function hostOf(address: string): string {
  try {
    return new URL(address).host;
  } catch {
    return address;
  }
}

/** Shows the extracted details so the user can correct them before saving. */
export default function ConfirmScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<ConfirmParams>();
  const isReceipt = Boolean(params.photoUri);
  const [api, setApi] = useState<ApiSettings | null>(null);
  // Set once the user's API has read the receipt; the form restarts with its answer.
  const [apiRead, setApiRead] = useState<ReceiptRead | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [showAllText, setShowAllText] = useState(false);

  useEffect(() => {
    if (isReceipt) {
      getApiSettings().then(setApi).catch(() => setApi(null));
    }
  }, [isReceipt]);

  const initialValues: TransactionFormValues = apiRead
    ? {
        type: 'expense',
        amount: apiRead.amount?.toString() ?? '',
        item: apiRead.item,
        shop: apiRead.shop ?? '',
        date: apiRead.date ?? params.date ?? '',
        category: apiRead.category,
      }
    : {
        type: params.type === 'income' ? 'income' : 'expense',
        amount: params.amount ?? '',
        item: params.item ?? '',
        shop: params.shop ?? '',
        date: params.date ?? '',
        category: params.category ?? '',
      };

  const notices = [
    apiRead && api && `Filled in by ${api.name || api.model}. Check every field.`,
    !apiRead && params.readBy === 'keywords' && "The AI couldn't read this, so check every field.",
    !apiRead &&
      params.typeOverridden &&
      `Check this: it reads like ${params.type === 'income' ? 'an expense' : 'income'}, but you picked ${params.type}.`,
    !apiRead &&
      params.otherCurrency &&
      `This mentions ${params.otherCurrency}. The app only tracks taka for now, so convert the amount to ৳ before saving.`,
  ].filter(Boolean);

  const rawInput = params.rawInput ?? '';
  const lines = rawInput.split('\n');
  const shownText =
    isReceipt && !showAllText && lines.length > RECEIPT_PREVIEW_LINES
      ? lines.slice(0, RECEIPT_PREVIEW_LINES).join('\n')
      : rawInput;

  async function readWithApi() {
    if (!params.photoUri) return;
    setIsAsking(true);
    try {
      setApiRead(await readReceiptWithUserApi(db, params.photoUri, rawInput));
    } catch (error) {
      Alert.alert("Couldn't read the receipt", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsAsking(false);
    }
  }

  function handleApiButton() {
    if (!api) return;
    if (hasApiConsent()) {
      void readWithApi();
      return;
    }
    Alert.alert(
      'Send this photo?',
      `The receipt photo will go to ${hostOf(api.address)} under that service's terms. Some free plans use what you send to improve their products and let people review it. Receipts can show names, phone numbers or card endings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            giveApiConsent();
            void readWithApi();
          },
        },
      ],
    );
  }

  async function handleSave(fields: TransactionFields) {
    const source: TransactionSource = apiRead ? 'receipt_api' : isReceipt ? 'receipt_local' : 'text';
    // Home adds every amount into one ৳ total, so everything is saved as BDT for now.
    await addTransaction(db, { ...fields, currency: 'BDT', source, rawInput: rawInput || null });
    router.dismissAll();
  }

  return (
    <TransactionForm
      // A new key restarts the form with the API's answer.
      key={apiRead ? 'api' : 'first'}
      initialValues={initialValues}
      onSubmit={handleSave}
      categoryNote={apiRead ? apiRead.categoryNote : parseNote(params.categoryNote)}
      amountNote={apiRead ? apiRead.amountNote : parseNote(params.amountNote)}
      dateNote={apiRead ? apiRead.dateNote : parseNote(params.dateNote)}
      header={
        <View style={styles.header}>
          <View style={styles.card}>
            {rawInput ? (
              <View style={styles.original}>
                <Text style={styles.label}>{isReceipt ? 'Read from receipt' : 'You wrote'}</Text>
                <Text style={styles.originalText} selectable>
                  {shownText}
                </Text>
                {isReceipt && lines.length > RECEIPT_PREVIEW_LINES && (
                  <Pressable accessibilityRole="button" onPress={() => setShowAllText(!showAllText)} hitSlop={spacing.sm}>
                    <Text style={styles.toggle}>{showAllText ? 'Show less' : `Show all ${lines.length} lines`}</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
            {notices.map((notice) => (
              <Text key={String(notice)} style={styles.noticeText}>
                {notice}
              </Text>
            ))}
          </View>
          {isReceipt && api && isApiReady(api) && !apiRead && (
            <Button
              title={isAsking ? 'Reading…' : apiButtonLabel(api)}
              variant="secondary"
              onPress={handleApiButton}
              disabled={isAsking}
            />
          )}
        </View>
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    original: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: colors.textMuted,
    },
    originalText: {
      ...typography.body,
      color: colors.text,
    },
    toggle: {
      ...typography.meta,
      fontFamily: fonts.semiBold,
      color: colors.accent,
    },
    noticeText: {
      ...typography.meta,
      color: colors.warning,
    },
  });
