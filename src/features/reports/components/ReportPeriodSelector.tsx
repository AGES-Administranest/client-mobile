import { CalendarDays, ChevronDown } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import type { CalendarRange } from 'shared/utils/calendar';

type ReportPeriodSelectorProps = {
  label: string;
  periodLabel: string;
  range: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  isCalendarOpen: boolean;
  onToggleCalendar: () => void;
  locale: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

export function ReportPeriodSelector({
  label,
  periodLabel,
  range,
  onRangeChange,
  isCalendarOpen,
  onToggleCalendar,
  locale,
  previousMonthLabel,
  nextMonthLabel,
  className,
}: ReportPeriodSelectorProps) {
  return (
    <View className={cn('gap-2', className)}>
      <Text className="text-sm font-medium">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${periodLabel}`}
        accessibilityState={{ expanded: isCalendarOpen }}
        onPress={onToggleCalendar}
        className="min-h-9 flex-row items-center gap-2 rounded-lg border border-border-primary bg-white px-3 py-2"
      >
        <Icon as={CalendarDays} className="size-4 text-label-primary" />
        <Text className="flex-1 text-sm" numberOfLines={1}>
          {periodLabel}
        </Text>
        <Icon as={ChevronDown} className="size-4 text-label-tertiary" />
      </Pressable>
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

export type { ReportPeriodSelectorProps };
