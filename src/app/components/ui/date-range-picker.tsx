import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import {
  addMonths,
  buildMonthGrid,
  fromCalendarDate,
  isWithinCalendarRange,
  selectRangeDay,
  type CalendarRange,
} from 'shared/utils/calendar';

const WEEK_LENGTH = 7;
const FIRST_SUNDAY = new Date(2024, 0, 7);

type DateRangePickerProps = {
  value: CalendarRange;
  onChange: (range: CalendarRange) => void;
  locale: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

function useVisibleMonth(range: CalendarRange) {
  const anchor = range.from ? fromCalendarDate(range.from) : new Date();

  return React.useState({
    year: anchor.getFullYear(),
    monthIndex: anchor.getMonth(),
  });
}

function DateRangePicker({
  value,
  onChange,
  locale,
  previousMonthLabel,
  nextMonthLabel,
  className,
}: DateRangePickerProps) {
  const [visible, setVisible] = useVisibleMonth(value);

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(visible.year, visible.monthIndex, 1));

  const weekdays = Array.from({ length: WEEK_LENGTH }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(
      new Date(
        FIRST_SUNDAY.getFullYear(),
        FIRST_SUNDAY.getMonth(),
        FIRST_SUNDAY.getDate() + index,
      ),
    ),
  );

  const days = buildMonthGrid(visible.year, visible.monthIndex);
  const weeks = Array.from({ length: days.length / WEEK_LENGTH }, (_, index) =>
    days.slice(index * WEEK_LENGTH, (index + 1) * WEEK_LENGTH),
  );

  const goToMonth = (amount: number) =>
    setVisible(current => addMonths(current.year, current.monthIndex, amount));

  return (
    <View className={cn('gap-2 rounded-2xl bg-white p-3', className)}>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousMonthLabel}
          onPress={() => goToMonth(-1)}
          className="size-8 items-center justify-center rounded-full bg-details-primary"
        >
          <Icon as={ChevronLeft} className="size-4 text-label-primary" />
        </Pressable>
        <Text className="font-semibold capitalize">{monthLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextMonthLabel}
          onPress={() => goToMonth(1)}
          className="size-8 items-center justify-center rounded-full bg-details-primary"
        >
          <Icon as={ChevronRight} className="size-4 text-label-primary" />
        </Pressable>
      </View>

      <View className="flex-row">
        {weekdays.map((weekday, index) => (
          <Text
            key={`${weekday}-${index}`}
            variant="muted"
            className="flex-1 text-center text-xs uppercase"
          >
            {weekday}
          </Text>
        ))}
      </View>

      {weeks.map(week => (
        <View key={week[0].date} className="flex-row">
          {week.map(day => {
            const isEdge = day.date === value.from || day.date === value.to;
            const isInside =
              value.from !== null &&
              value.to !== null &&
              isWithinCalendarRange(day.date, value);

            return (
              <Pressable
                key={day.date}
                testID={day.date}
                accessibilityRole="button"
                accessibilityLabel={new Intl.DateTimeFormat(locale, {
                  dateStyle: 'long',
                }).format(fromCalendarDate(day.date))}
                accessibilityState={{ selected: isEdge || isInside }}
                onPress={() => onChange(selectRangeDay(value, day.date))}
                className={cn(
                  'h-9 flex-1 items-center justify-center rounded-lg',
                  isInside && 'bg-details-primary',
                  isEdge && 'bg-button-primary',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    !day.isCurrentMonth && 'text-label-tertiary',
                    isEdge && 'text-label-secondary font-semibold',
                  )}
                >
                  {day.dayOfMonth}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export { DateRangePicker };
export type { DateRangePickerProps };
