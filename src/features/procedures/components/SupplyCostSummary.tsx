import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type SupplyCostSummaryMargin = {
  label: string;
  value: string;
};

type SupplyCostSummaryTravel = {
  label: string;
  /** Preformatted total, e.g. "– R$ 20,00". */
  value: string;
  isDeduction: boolean;
};

type SupplyCostSummaryProps = {
  totalLabel: string;
  /** Preformatted total, e.g. "– R$ 33,90". */
  totalValue: string;
  /** Red is reserved for deductions, so a zero total stays neutral. */
  isDeduction: boolean;
  /** Only shown when the appointment has trips to deduct. */
  travel?: SupplyCostSummaryTravel;
  /** Only shown when the procedure's billed amount is known. */
  grossMargin?: SupplyCostSummaryMargin;
  className?: string;
};

function SupplyCostSummary({
  totalLabel,
  totalValue,
  isDeduction,
  travel,
  grossMargin,
  className,
}: SupplyCostSummaryProps) {
  return (
    <View className={cn('rounded-2xl bg-details-primary px-4', className)}>
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-sm text-label-primary">{totalLabel}</Text>
        <Text
          className={cn(
            'text-sm font-semibold',
            isDeduction ? 'text-alert-primary' : 'text-label-primary',
          )}
        >
          {totalValue}
        </Text>
      </View>

      {travel ? (
        <View className="flex-row items-center justify-between border-t border-border-primary py-4">
          <Text className="text-sm text-label-primary">{travel.label}</Text>
          <Text
            className={cn(
              'text-sm font-semibold',
              travel.isDeduction ? 'text-alert-primary' : 'text-label-primary',
            )}
          >
            {travel.value}
          </Text>
        </View>
      ) : null}

      {grossMargin ? (
        <View className="flex-row items-center justify-between border-t border-border-primary py-4">
          <Text className="text-base font-semibold text-label-primary">
            {grossMargin.label}
          </Text>
          <Text className="text-base font-bold text-label-primary">
            {grossMargin.value}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export { SupplyCostSummary };
export type {
  SupplyCostSummaryMargin,
  SupplyCostSummaryProps,
  SupplyCostSummaryTravel,
};
