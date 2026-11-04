import { CalendarDays } from 'lucide-react-native';
import { View } from 'react-native';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { Icon } from 'app/components/ui/icon';
import {
  SegmentedControl,
  type SegmentOption,
} from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import type { CalendarRange } from 'shared/utils/calendar';

type ReportPeriodSelectorProps<T extends string> = {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  periodLabel: string;
  isCustom: boolean;
  range: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  locale: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

export function ReportPeriodSelector<T extends string>({
  label,
  options,
  value,
  onValueChange,
  periodLabel,
  isCustom,
  range,
  onRangeChange,
  locale,
  previousMonthLabel,
  nextMonthLabel,
  className,
}: ReportPeriodSelectorProps<T>) {
  return (
    <View className={cn('gap-2', className)}>
      <Text className="text-sm font-medium">{label}</Text>
      <SegmentedControl
        options={options}
        value={value}
        onValueChange={onValueChange}
      />
      <View
        accessible
        accessibilityLabel={`${label}: ${periodLabel}`}
        className="min-h-9 flex-row items-center gap-2 rounded-lg border border-border-primary bg-white px-3 py-2"
      >
        <Icon as={CalendarDays} className="size-4 text-label-primary" />
        <Text className="flex-1 text-sm" numberOfLines={1}>
          {periodLabel}
        </Text>
      </View>
      {isCustom ? (
        <DateRangePicker
          value={range}
          onChange={onRangeChange}
          locale={locale}
          previousMonthLabel={previousMonthLabel}
          nextMonthLabel={nextMonthLabel}
        />
      ) : null}
    </View>
  );
}

export type { ReportPeriodSelectorProps };
