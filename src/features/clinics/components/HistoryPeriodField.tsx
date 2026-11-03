import { CalendarDays } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import type { CalendarRange } from 'shared/utils/calendar';

type HistoryPeriodFieldTexts = {
  label: string;
  choosePeriod: string;
  previousMonth: string;
  nextMonth: string;
  currentMonth: string;
  apply: string;
};

type HistoryPeriodFieldProps = {
  texts: HistoryPeriodFieldTexts;
  locale: string;
  periodLabel: string;
  isOpen: boolean;
  draft: CalendarRange;
  canApply: boolean;
  onToggle: () => void;
  onChoose: (range: CalendarRange) => void;
  onShowCurrentMonth: () => void;
  onApply: () => void;
};

function HistoryPeriodField({
  texts,
  locale,
  periodLabel,
  isOpen,
  draft,
  canApply,
  onToggle,
  onChoose,
  onShowCurrentMonth,
  onApply,
}: HistoryPeriodFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-label-primary">
        {texts.label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${texts.label}, ${periodLabel}`}
        accessibilityHint={texts.choosePeriod}
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        className="flex-row items-center gap-2 rounded-xl border border-border-primary bg-white px-4 py-2.5"
      >
        <Text
          numberOfLines={1}
          className="flex-1 text-[15px] text-label-primary"
        >
          {periodLabel}
        </Text>
        <Icon as={CalendarDays} size={16} className="text-label-primary" />
      </Pressable>

      {isOpen ? (
        <View className="gap-3 rounded-[14px] bg-white p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
          <DateRangePicker
            value={draft}
            onChange={onChoose}
            locale={locale}
            previousMonthLabel={texts.previousMonth}
            nextMonthLabel={texts.nextMonth}
            className="p-0"
          />
          <View className="flex-row items-center justify-between pt-1">
            <Pressable
              accessibilityRole="button"
              onPress={onShowCurrentMonth}
              hitSlop={8}
            >
              <Text className="text-[13px] font-semibold text-label-quartenery">
                {texts.currentMonth}
              </Text>
            </Pressable>
            <Button
              shape="pill"
              size="sm"
              disabled={!canApply}
              onPress={onApply}
              className="h-8 px-4"
            >
              <Text className="text-xs font-semibold">{texts.apply}</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export { HistoryPeriodField };
export type { HistoryPeriodFieldProps, HistoryPeriodFieldTexts };
