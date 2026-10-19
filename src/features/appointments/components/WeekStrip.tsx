import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { buildMonthGrid } from 'shared/utils/calendar';

import type { Appointment } from '../domain/appointment';

const DAY_WIDTH = 48;
const DAY_GAP = 6;

type WeekStripProps = {
  year: number;
  monthIndex: number;
  selectedDate: string;
  appointmentsByDate: Record<string, Appointment[]>;
  locale: string;
  onSelectDate: (date: string) => void;
};

// The visible month as a horizontal row of days, kept scrolled to the
// selected one (the Figma home header).
export function WeekStrip({
  year,
  monthIndex,
  selectedDate,
  appointmentsByDate,
  locale,
  onSelectDate,
}: WeekStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const days = useMemo(
    () => buildMonthGrid(year, monthIndex).filter(day => day.isCurrentMonth),
    [year, monthIndex],
  );

  const selectedIndex = days.findIndex(day => day.date === selectedDate);

  // Runs after layout too: scrolling before the days are measured is a no-op
  // on web.
  useEffect(() => {
    if (selectedIndex < 0 || width === 0 || contentWidth === 0) return;
    const center =
      selectedIndex * (DAY_WIDTH + DAY_GAP) + DAY_WIDTH / 2 - width / 2;
    const x = Math.min(Math.max(center, 0), Math.max(contentWidth - width, 0));
    const frame = requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ x, animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, [selectedIndex, width, contentWidth]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={contentSizeWidth =>
        setContentWidth(contentSizeWidth)
      }
      contentContainerClassName="px-4"
      contentContainerStyle={{ gap: DAY_GAP }}
    >
      {days.map(day => {
        const isSelected = day.date === selectedDate;
        const hasAppointments = (appointmentsByDate[day.date]?.length ?? 0) > 0;
        const weekday = weekdayLabel(day.date, locale);

        return (
          <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityLabel={`${weekday} ${day.dayOfMonth}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectDate(day.date)}
            style={{ width: DAY_WIDTH }}
            className={cn(
              'h-16 items-center justify-center rounded-xl active:opacity-80',
              isSelected ? 'bg-details-tertiary' : 'bg-details-secondary',
            )}
          >
            <Text className="text-xs text-label-tertiary">{weekday}</Text>
            <Text className="text-lg font-bold text-label-primary">
              {day.dayOfMonth}
            </Text>
            <View
              className={cn(
                'size-1 rounded-full',
                hasAppointments ? 'bg-label-primary' : 'bg-transparent',
              )}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// "qui." → "Qui"
function weekdayLabel(date: string, locale: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const label = new Date(year, month - 1, day)
    .toLocaleDateString(locale, { weekday: 'short' })
    .replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
