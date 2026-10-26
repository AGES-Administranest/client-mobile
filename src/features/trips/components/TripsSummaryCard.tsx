import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { MonthSelector } from 'shared/components/MonthSelector';

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

export type TripsSummaryStatus = 'ready' | 'loading' | 'error';

export type TripsSummaryCardProps = {
  texts: TripsSummaryTexts;
  status: TripsSummaryStatus;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

const TILE_LABEL =
  'text-[10px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-primary';

function SkeletonBar({ className }: { className: string }) {
  return <View className={cn('rounded-md bg-border-primary/50', className)} />;
}

// The Figma "Card" of the trips screen: the month, the cost of the month and
// two tiles. Loading draws bars where the values go; a failed load keeps the
// card and shows dashes in the muted color.
export function TripsSummaryCard({
  texts,
  status,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
}: TripsSummaryCardProps) {
  const isError = status === 'error';
  const isLoading = status === 'loading';
  const valueColor = isError ? 'text-label-tertiary' : 'text-label-primary';

  return (
    <Card className="gap-0 rounded-[14px] p-4 shadow-[0px_5px_5px_rgba(0,0,0,0.1)]">
      <MonthSelector
        label={texts.monthLabel}
        caption={isCurrentMonth ? texts.currentMonth : null}
        previousLabel={texts.previousMonth}
        nextLabel={texts.nextMonth}
        onPrevious={onPreviousMonth}
        onNext={onNextMonth}
        nextDisabled={isCurrentMonth}
      />

      <Text className="pt-3 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-primary">
        {texts.costInMonth}
      </Text>
      <View className="h-[54px] justify-center pt-1.5">
        {isLoading ? (
          <SkeletonBar className="h-[30px] w-[150px]" />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className={cn(
              'text-[36px] font-bold leading-[54px] tracking-[-0.72px]',
              valueColor,
            )}
          >
            {isError ? 'R$ —' : texts.totalCost}
          </Text>
        )}
      </View>

      <View className="flex-row gap-2 pt-2.5">
        <View className="min-w-0 flex-1 gap-0.5 rounded-[10px] bg-details-primary px-2.5 py-2">
          <Text className={TILE_LABEL}>{texts.kmDriven}</Text>
          {isLoading ? (
            <SkeletonBar className="h-3.5 w-16" />
          ) : (
            <Text className={cn('text-[15px] font-bold', valueColor)}>
              {isError ? '— km' : texts.totalKm}
            </Text>
          )}
        </View>

        <View className="min-w-0 flex-1 gap-0.5 rounded-[10px] bg-details-primary px-2.5 py-2">
          <Text className={TILE_LABEL}>{texts.tripsCount}</Text>
          {isLoading ? (
            <SkeletonBar className="h-3.5 w-7" />
          ) : (
            <Text className={cn('text-[15px] font-bold', valueColor)}>
              {isError ? '—' : texts.count}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
