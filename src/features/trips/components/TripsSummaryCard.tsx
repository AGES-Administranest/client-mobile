import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type TripsSummaryTexts = {
  monthLabel: string;
  currentMonth: string;
  previousMonth: string;
  nextMonth: string;
  costInMonth: string;
  kmDriven: string;
  tripsCount: string;
  totalCost: string;
  totalKm: string;
  count: string;
};

export type TripsSummaryCardProps = {
  texts: TripsSummaryTexts;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function TripsSummaryCard({
  texts,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
}: TripsSummaryCardProps) {
  return (
    <View className="rounded-2xl border border-border-primary bg-white p-5">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.previousMonth}
          hitSlop={8}
          onPress={onPreviousMonth}
          className="size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ChevronLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-semibold text-label-primary">
            {texts.monthLabel}
          </Text>
          {isCurrentMonth ? (
            <Text className="mt-0.5 text-[10px] font-bold tracking-widest text-label-tertiary">
              {texts.currentMonth}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.nextMonth}
          accessibilityState={{ disabled: isCurrentMonth }}
          disabled={isCurrentMonth}
          hitSlop={8}
          onPress={onNextMonth}
          className={
            isCurrentMonth
              ? 'size-10 items-center justify-center rounded-full bg-border-primary opacity-60'
              : 'size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80'
          }
        >
          <Icon as={ChevronRight} size={20} className="text-label-secondary" />
        </Pressable>
      </View>

      <View className="mt-4">
        <Text className="text-xs font-bold tracking-wider text-label-primary">
          {texts.costInMonth}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-label-primary">
          {texts.totalCost}
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-details-primary p-3.5">
          <Text className="text-[10px] font-bold tracking-wider text-label-primary">
            {texts.kmDriven}
          </Text>
          <Text className="mt-1 text-lg font-bold text-label-primary">
            {texts.totalKm}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-details-primary p-3.5">
          <Text className="text-[10px] font-bold tracking-wider text-label-primary">
            {texts.tripsCount}
          </Text>
          <Text className="mt-1 text-lg font-bold text-label-primary">
            {texts.count}
          </Text>
        </View>
      </View>
    </View>
  );
}
