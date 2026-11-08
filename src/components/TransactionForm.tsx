import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CategoryChips } from '@/components/CategoryChips';
import { FormField } from '@/components/FormField';
import { TypeToggle } from '@/components/TypeToggle';
import { CATEGORY_MATCH, UNCATEGORISED, type CategoryLists } from '@/constants/model';
import { fonts, spacing, typography, type ThemeColors } from '@/constants/theme';
import { hasCategory, listCategories } from '@/db/categories';
import { useThemedStyles } from '@/hooks/useTheme';
import { closestCategory } from '@/services/categoryMatch';
import type { CategoryNote, TransactionFields, TransactionType } from '@/types/transaction';
import { formatAmount, isValidIsoDate } from '@/utils/format';

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  item: string;
  shop: string;
  date: string;
  category: string;
};

type TransactionFormProps = {
  initialValues: TransactionFormValues;
  /** Should leave the screen when it succeeds. If it throws, the form stays open. */
  onSubmit: (fields: TransactionFields) => Promise<void>;
  /** Shown above the fields. */
  header?: ReactNode;
  /** Explains or offers a category choice, under the chips. */
  categoryNote?: CategoryNote | null;
  /** Shown below the fields. */
  children?: ReactNode;
};

/** The transaction fields, shared by the Confirm and Edit screens. */
export function TransactionForm({ initialValues, onSubmit, header, categoryNote, children }: TransactionFormProps) {
  const db = useSQLiteContext();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [type, setType] = useState(initialValues.type);
  const [amount, setAmount] = useState(initialValues.amount);
  const [item, setItem] = useState(initialValues.item);
  const [shop, setShop] = useState(initialValues.shop);
  const [date, setDate] = useState(initialValues.date);
  // Uncategorised is what an empty field saves as, so it isn't shown as a chip.
  const [category, setCategory] = useState(initialValues.category === UNCATEGORISED ? '' : initialValues.category);
  // The text box holds only a name typed by hand; picking a chip leaves it empty.
  const [typedCategory, setTypedCategory] = useState('');
  const [categories, setCategories] = useState<CategoryLists>({ expense: [], income: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    listCategories(db)
      .then((lists) => isCurrent && setCategories(lists))
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [db]);

  const parsedAmount = Number(amount);
  const amountIsValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const trimmedDate = date.trim();
  const dateIsValid = isValidIsoDate(trimmedDate);
  const canSave = amountIsValid && item.trim() !== '' && dateIsValid;
  const saveTitle = `Save ${type}${amountIsValid ? ` ${formatAmount(parsedAmount)}` : ''}`;

  // A category of the old type is cleared unless the new type has the same name, like Family.
  function handleTypeChange(next: TransactionType) {
    setType(next);
    if (category.trim() && !hasCategory(categories[next], category)) {
      setCategory('');
      setTypedCategory('');
    }
  }

  function handlePickCategory(name: string) {
    setCategory(name);
    setTypedCategory('');
  }

  function handleTypeCategory(text: string) {
    setTypedCategory(text);
    setCategory(text);
  }

  async function save(categoryName = category.trim()) {
    setIsSaving(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        item: item.trim(),
        shop: shop.trim() || null,
        date: trimmedDate,
        category: categoryName || UNCATEGORISED,
      });
    } catch {
      Alert.alert('Could not save', 'Your transaction was not saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    const other = type === 'income' ? 'expense' : 'income';
    const name = category.trim();
    // Safety net: a name typed by hand that only the other type has is probably a mistake.
    if (name && !hasCategory(categories[type], name) && hasCategory(categories[other], name)) {
      Alert.alert(`“${name}” is an ${other} category`, `Save it as a new ${type} category?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => void save() },
      ]);
      return;
    }
    // A typed new name close in meaning to an existing one, like "Tech" for Electronics.
    if (typedCategory.trim() && name && !hasCategory(categories[type], name)) {
      setIsSaving(true);
      const match = await closestCategory(db, type, name).catch(() => null);
      setIsSaving(false);
      if (match && match.score >= CATEGORY_MATCH.suggest) {
        Alert.alert(`Did you mean ${match.name}?`, `“${name}” is close to your ${type} category ${match.name}.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: `Create “${name}”`, onPress: () => void save(name) },
          { text: `Use ${match.name}`, onPress: () => void save(match.name) },
        ]);
        return;
      }
    }
    void save();
  }

  const showNote = categoryNote != null && category.trim().toLowerCase() === categoryNote.shownFor.trim().toLowerCase();

  return (
    // Edge-to-edge Android no longer resizes the window for the keyboard, so Save is lifted by hand.
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {header}
        <View style={styles.section}>
          <TypeToggle value={type} onChange={handleTypeChange} />
          <Text style={styles.hint}>Money going out is an expense, money coming in is income.</Text>
        </View>
        <FormField
          label="Amount (৳)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.amount}
        />
        <FormField label="Item" value={item} onChangeText={setItem} />
        <FormField
          label={type === 'income' ? 'From' : 'Shop'}
          value={shop}
          onChangeText={setShop}
          placeholder="Optional"
        />
        <FormField
          label={dateIsValid ? 'Date' : 'Date (use YYYY-MM-DD)'}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          {/* A new key per type resets the row's scroll, so a short list isn't left scrolled out of view. */}
          <CategoryChips
            key={type}
            names={categories[type]}
            value={category}
            type={type}
            onChange={handlePickCategory}
          />
          {showNote && (
            <View style={styles.note}>
              <Text style={styles.noteText}>{categoryNote.text}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => handlePickCategory(categoryNote.value)}
                hitSlop={spacing.sm}
              >
                <Text style={styles.noteAction}>{categoryNote.actionLabel}</Text>
              </Pressable>
            </View>
          )}
        </View>
        <FormField
          label="Or type a new category"
          value={typedCategory}
          onChangeText={handleTypeCategory}
          placeholder="Optional"
        />
        {children}
      </ScrollView>
      {/* Outside the scroll view, so a long form never pushes Save off screen. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button title={isSaving ? 'Saving…' : saveTitle} onPress={handleSubmit} disabled={!canSave || isSaving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.gutter,
      gap: spacing.md,
    },
    section: {
      gap: spacing.xs,
    },
    hint: {
      ...typography.meta,
      color: colors.textMuted,
    },
    label: {
      ...typography.meta,
      color: colors.textMuted,
    },
    amount: {
      fontVariant: ['tabular-nums'],
    },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    noteText: {
      ...typography.meta,
      flex: 1,
      color: colors.textMuted,
    },
    noteAction: {
      ...typography.meta,
      fontFamily: fonts.semiBold,
      color: colors.accent,
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
