import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type PeriodBalanceCardProps = {
  monthLabel: string;
  currentMonthLabel: string | null;
  netBalanceLabel: string;
  netBalance: string;
  isNegative: boolean;
  previousMonthLabel: string;
  nextMonthLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function PeriodBalanceCard({
  monthLabel,
  currentMonthLabel,
  netBalanceLabel,
  netBalance,
  isNegative,
  previousMonthLabel,
  nextMonthLabel,
  onPreviousMonth,
  onNextMonth,
}: PeriodBalanceCardProps) {
  return (
    <Card className="gap-0 rounded-[14px] p-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousMonthLabel}
          onPress={onPreviousMonth}
          className="size-8 items-center justify-center rounded-full bg-button-primary"
        >
          <Icon as={ArrowLeft} size={16} className="text-label-secondary" />
        </Pressable>
        <View className="items-center">
          <Text className="text-sm text-label-primary">{monthLabel}</Text>
          {currentMonthLabel ? (
            <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-label-tertiary">
              {currentMonthLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextMonthLabel}
          onPress={onNextMonth}
          className="size-8 items-center justify-center rounded-full bg-button-primary"
        >
          <Icon as={ArrowRight} size={16} className="text-label-secondary" />
        </Pressable>
      </View>
      <Text className="pt-3 text-[11px] font-semibold uppercase tracking-[0.44px] text-label-primary">
        {netBalanceLabel}
      </Text>
      <Text
        className={cn(
          'pt-1 text-4xl font-bold tracking-tight',
          isNegative ? 'text-alert-primary' : 'text-label-primary',
        )}
      >
        {netBalance}
      </Text>
    </Card>
  );
}
