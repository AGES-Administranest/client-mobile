import { View } from 'react-native';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import {
  SelectField,
  type SelectFieldOption,
} from 'app/components/ui/select-field';
import { cn } from 'app/lib/utils';
import type { CalendarRange } from 'shared/utils/calendar';

import { ReportDateField } from './ReportDateField';

type ReportPeriodSelectorProps<T extends string> = {
  label: string;
  description: string;
  options: readonly SelectFieldOption<T>[];
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
  maxRangeDays?: number;
  locale: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  previousYearLabel?: string;
  nextYearLabel?: string;
  className?: string;
};

export function ReportPeriodSelector<T extends string>({
  label,
  description,
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
  maxRangeDays,
  locale,
  previousMonthLabel,
  nextMonthLabel,
  previousYearLabel,
  nextYearLabel,
  className,
}: ReportPeriodSelectorProps<T>) {
  return (
    <View className={cn('gap-3', className)}>
      <SelectField
        label={label}
        description={description}
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
          maxRangeDays={maxRangeDays}
          locale={locale}
          previousMonthLabel={previousMonthLabel}
          nextMonthLabel={nextMonthLabel}
          previousYearLabel={previousYearLabel}
          nextYearLabel={nextYearLabel}
        />
      ) : null}
    </View>
  );
}

export type { ReportPeriodSelectorProps };
