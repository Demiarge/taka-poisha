import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TypeToggle } from '@/components/TypeToggle';
import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import { parseTransaction } from '@/services/parseTransaction';
import type { TransactionType } from '@/types/transaction';
import { toIsoDate } from '@/utils/format';

export default function AddTransactionScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  // null = the user hasn't picked, so the parser decides.
  const [type, setType] = useState<TransactionType | null>(null);
  const [text, setText] = useState('');
  const [isReading, setIsReading] = useState(false);

  async function handleNext() {
    setIsReading(true);
    try {
      const parsed = await parseTransaction(text);
      // Route params must be strings, so missing values become ''.
      router.push({
        pathname: '/confirm',
        params: {
          type: type ?? parsed.type,
          amount: parsed.amount?.toString() ?? '',
          item: parsed.item,
          shop: parsed.shop ?? '',
          date: parsed.date ?? toIsoDate(new Date()),
          category: parsed.category,
          rawInput: text,
        },
      });
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
      <Button
        title={isReading ? 'Reading…' : 'Next'}
        onPress={handleNext}
        disabled={text.trim() === '' || isReading}
      />
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
  });
