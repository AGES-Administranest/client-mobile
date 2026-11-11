import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';
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
  /** Com os dois rótulos, aparecem setas que pulam 12 meses. */
  previousYearLabel?: string;
  nextYearLabel?: string;
  /** Último dia selecionável (YYYY-MM-DD); depois dele os dias ficam bloqueados. */
  maxDate?: string;
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
  previousYearLabel,
  nextYearLabel,
  maxDate,
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

  const lastVisibleMonth = maxDate ? fromCalendarDate(maxDate) : null;
  const monthsUntilMax =
    lastVisibleMonth === null
      ? Infinity
      : lastVisibleMonth.getFullYear() * 12 +
        lastVisibleMonth.getMonth() -
        (visible.year * 12 + visible.monthIndex);
  const isAtLastMonth = monthsUntilMax <= 0;
  const canGoNextYear = monthsUntilMax >= 12;

  const goToMonth = (amount: number) =>
    setVisible(current => addMonths(current.year, current.monthIndex, amount));

  return (
    <View className={cn('gap-2 rounded-2xl bg-white p-3', className)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          {previousYearLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={previousYearLabel}
              onPress={() => goToMonth(-12)}
              className="size-8 items-center justify-center rounded-full bg-details-primary"
            >
              <Icon as={ChevronsLeft} className="size-4 text-label-primary" />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={previousMonthLabel}
            onPress={() => goToMonth(-1)}
            className="size-8 items-center justify-center rounded-full bg-details-primary"
          >
            <Icon as={ChevronLeft} className="size-4 text-label-primary" />
          </Pressable>
        </View>
        <Text className="font-semibold capitalize">{monthLabel}</Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nextMonthLabel}
            disabled={isAtLastMonth}
            onPress={() => goToMonth(1)}
            className={cn(
              'size-8 items-center justify-center rounded-full bg-details-primary',
              isAtLastMonth && 'opacity-40',
            )}
          >
            <Icon as={ChevronRight} className="size-4 text-label-primary" />
          </Pressable>
          {nextYearLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={nextYearLabel}
              disabled={!canGoNextYear}
              onPress={() => goToMonth(12)}
              className={cn(
                'size-8 items-center justify-center rounded-full bg-details-primary',
                !canGoNextYear && 'opacity-40',
              )}
            >
              <Icon as={ChevronsRight} className="size-4 text-label-primary" />
            </Pressable>
          ) : null}
        </View>
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

            const isBlocked = maxDate !== undefined && day.date > maxDate;

            return (
              <Pressable
                key={day.date}
                disabled={isBlocked}
                testID={day.date}
                accessibilityRole="button"
                accessibilityLabel={new Intl.DateTimeFormat(locale, {
                  dateStyle: 'long',
                }).format(fromCalendarDate(day.date))}
                accessibilityState={{
                  selected: isEdge || isInside,
                  disabled: isBlocked,
                }}
                onPress={() => onChange(selectRangeDay(value, day.date))}
                className={cn(
                  'h-9 flex-1 items-center justify-center rounded-lg',
                  isInside && 'bg-details-primary',
                  isEdge && 'bg-button-primary',
                  isBlocked && 'opacity-30',
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
