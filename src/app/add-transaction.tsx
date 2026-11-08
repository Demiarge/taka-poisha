import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TypeToggle } from '@/components/TypeToggle';
import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import { readReceiptPhoto, type ReceiptRead } from '@/services/readReceipt';
import { readTransaction, type ReadTransaction } from '@/services/readTransaction';
import type { TransactionType } from '@/types/transaction';
import { toIsoDate } from '@/utils/format';

// Smaller files read just as well and upload faster if the user later sends one to their API.
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };

/** Route params must be strings, so missing values become ''. */
function confirmParams(parsed: ReadTransaction, rawInput: string) {
  return {
    type: parsed.type,
    amount: parsed.amount?.toString() ?? '',
    item: parsed.item,
    shop: parsed.shop ?? '',
    date: parsed.date ?? toIsoDate(new Date()),
    category: parsed.category,
    rawInput,
    readBy: parsed.readBy,
    otherCurrency: parsed.otherCurrency ?? '',
    typeOverridden: parsed.typeOverridden ? '1' : '',
    categoryNote: parsed.categoryNote ? JSON.stringify(parsed.categoryNote) : '',
  };
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useThemedStyles(createStyles);
  // null = the user hasn't picked, so the parser decides.
  const [type, setType] = useState<TransactionType | null>(null);
  const [text, setText] = useState('');
  const [isReading, setIsReading] = useState(false);

  async function handleNext() {
    setIsReading(true);
    try {
      const parsed = await readTransaction(db, text, type ?? undefined);
      router.push({ pathname: '/confirm', params: confirmParams(parsed, text) });
    } finally {
      setIsReading(false);
    }
  }

  async function handleReceipt(source: 'camera' | 'gallery') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera not allowed', 'Allow camera access in your phone settings to photograph receipts.');
        return;
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PHOTO_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS);
    const photo = result.canceled ? null : result.assets[0];
    if (!photo) {
      return;
    }
    setIsReading(true);
    try {
      const parsed: ReceiptRead = await readReceiptPhoto(db, photo.uri);
      router.push({
        pathname: '/confirm',
        params: {
          ...confirmParams(parsed, parsed.receiptText),
          photoUri: photo.uri,
          amountNote: parsed.amountNote ? JSON.stringify(parsed.amountNote) : '',
          dateNote: parsed.dateNote ? JSON.stringify(parsed.dateNote) : '',
        },
      });
    } catch (error) {
      Alert.alert("Couldn't read this receipt", error instanceof Error ? error.message : 'Please try another photo.');
    } finally {
      setIsReading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.typePicker}>
        <TypeToggle value={type} onChange={setType} />
        {type === null && <Text style={styles.hint}>Skip this and the app will work it out from your text.</Text>}
      </View>
      <FormField
        label="What did you spend or receive?"
        placeholder='e.g. "spent 500 on biriyani" or "got salary 30000"'
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        style={styles.input}
      />
      <Button title={isReading ? 'Reading…' : 'Next'} onPress={handleNext} disabled={text.trim() === '' || isReading} />
      <View style={styles.receipt}>
        <Text style={styles.hint}>Or read a receipt (always an expense)</Text>
        <View style={styles.receiptButtons}>
          <View style={styles.receiptButton}>
            <Button title="Take photo" variant="secondary" onPress={() => handleReceipt('camera')} disabled={isReading} />
          </View>
          <View style={styles.receiptButton}>
            <Button
              title="Choose photo"
              variant="secondary"
              onPress={() => handleReceipt('gallery')}
              disabled={isReading}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: spacing.gutter,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    typePicker: {
      gap: spacing.xs,
    },
    hint: {
      ...typography.meta,
      color: colors.textMuted,
    },
    input: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    receipt: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    receiptButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    receiptButton: {
      flex: 1,
    },
  });
