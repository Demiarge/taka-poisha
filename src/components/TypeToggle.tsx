import { SegmentedControl } from '@/components/SegmentedControl';
import { useColors } from '@/hooks/useTheme';
import type { TransactionType } from '@/types/transaction';

type TypeToggleProps = {
  value: TransactionType | null;
  onChange: (type: TransactionType) => void;
};

/** Expense / Income switch. The picked side takes that type's colour. */
export function TypeToggle({ value, onChange }: TypeToggleProps) {
  const colors = useColors();

  return (
    <SegmentedControl
      options={[
        { value: 'expense', label: 'Expense', fill: colors.expenseFill },
        { value: 'income', label: 'Income', fill: colors.incomeFill },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}
