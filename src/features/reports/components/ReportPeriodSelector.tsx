import { View } from 'react-native';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import {
  SegmentedControl,
  type SegmentOption,
} from 'app/components/ui/segmented-control';
import { cn } from 'app/lib/utils';
import type { CalendarRange } from 'shared/utils/calendar';

import { ReportDateField } from './ReportDateField';

type ReportPeriodSelectorProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  startDateLabel: string;
  startDateValue: string;
  endDateLabel: string;
  endDateValue: string;
  onDateFieldPress: () => void;
  isCustom: boolean;
  range: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  maxDate: string;
  locale: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

export function ReportPeriodSelector<T extends string>({
  options,
  value,
  onValueChange,
  startDateLabel,
  startDateValue,
  endDateLabel,
  endDateValue,
  onDateFieldPress,
  isCustom,
  range,
  onRangeChange,
  maxDate,
  locale,
  previousMonthLabel,
  nextMonthLabel,
  className,
}: ReportPeriodSelectorProps<T>) {
  return (
    <View className={cn('gap-3', className)}>
      <SegmentedControl
        options={options}
        value={value}
        onValueChange={onValueChange}
      />
      <View className="flex-row gap-3">
        <ReportDateField
          label={startDateLabel}
          value={startDateValue}
          isCalendarOpen={isCustom}
          onPress={onDateFieldPress}
        />
        <ReportDateField
          label={endDateLabel}
          value={endDateValue}
          isCalendarOpen={isCustom}
          onPress={onDateFieldPress}
        />
      </View>
      {isCustom ? (
        <DateRangePicker
          value={range}
          onChange={onRangeChange}
          maxDate={maxDate}
          locale={locale}
          previousMonthLabel={previousMonthLabel}
          nextMonthLabel={nextMonthLabel}
        />
      ) : null}
    </View>
  );
}

export type { ReportPeriodSelectorProps };
