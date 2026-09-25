import { CalendarDays, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import type { CalendarRange } from 'shared/utils/calendar';

type ProcedurePeriodFilterProps = {
  range: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  isCalendarOpen: boolean;
  onToggleCalendar: () => void;
  onClear: () => void;
  canClear: boolean;
  locale: string;
  periodLabel: string;
  clearLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

export function ProcedurePeriodFilter({
  range,
  onRangeChange,
  isCalendarOpen,
  onToggleCalendar,
  onClear,
  canClear,
  locale,
  periodLabel,
  clearLabel,
  previousMonthLabel,
  nextMonthLabel,
  className,
}: ProcedurePeriodFilterProps) {
  return (
    <View className={cn('gap-2', className)}>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isCalendarOpen }}
          onPress={onToggleCalendar}
          className={cn(
            'flex-1 flex-row items-center gap-2 rounded-full px-4 py-2',
            isCalendarOpen ? 'bg-details-primary' : 'bg-white',
          )}
        >
          <Icon as={CalendarDays} className="size-4 text-label-tertiary" />
          <Text className="flex-1 text-sm" numberOfLines={1}>
            {periodLabel}
          </Text>
        </Pressable>

        {canClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            onPress={onClear}
            className="flex-row items-center gap-1 rounded-full bg-white px-3 py-2"
          >
            <Icon as={X} className="size-4 text-alert-primary" />
            <Text className="text-sm text-alert-primary">{clearLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {isCalendarOpen ? (
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
