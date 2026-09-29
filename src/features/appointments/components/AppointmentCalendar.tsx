import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { buildMonthGrid } from 'shared/utils/calendar';

import type { Appointment } from '../domain/appointment';

const WEEK_LENGTH = 7;

export type AppointmentCalendarProps = {
  year: number;
  monthIndex: number;
  selectedDate: string;
  appointmentsByDate: Record<string, Appointment[]>;
  monthLabel: string;
  weekdays: string[];
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  className?: string;
};

export function AppointmentCalendar({
  year,
  monthIndex,
  selectedDate,
  appointmentsByDate,
  monthLabel,
  weekdays,
  previousMonthLabel = 'Mês anterior',
  nextMonthLabel = 'Próximo mês',
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  className,
}: AppointmentCalendarProps) {
  const days = buildMonthGrid(year, monthIndex);
  const weeks = Array.from({ length: days.length / WEEK_LENGTH }, (_, index) =>
    days.slice(index * WEEK_LENGTH, (index + 1) * WEEK_LENGTH),
  );
  // Remove rows that have no days of current month
  const visibleWeeks = weeks.filter(week =>
    week.some(day => day.isCurrentMonth),
  );

  return (
    <View className={cn('w-full', className)}>
      {/* Header: Navegação do mês (< Agosto 2026 >) */}
      <View className="flex-row items-center justify-between px-2 mb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousMonthLabel}
          onPress={onPreviousMonth}
          hitSlop={12}
          className="size-10 items-center justify-center rounded-full active:bg-details-primary/60"
        >
          <Icon as={ChevronLeft} className="size-6 text-label-primary" />
        </Pressable>

        <Text className="text-xl font-bold capitalize text-label-primary">
          {monthLabel}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextMonthLabel}
          onPress={onNextMonth}
          hitSlop={12}
          className="size-10 items-center justify-center rounded-full active:bg-details-primary/60"
        >
          <Icon as={ChevronRight} className="size-6 text-label-primary" />
        </Pressable>
      </View>

      {/* Dias da Semana (Dom Seg Ter Qua Qui Sex Sab) */}
      <View className="flex-row mb-2 px-1">
        {weekdays.map((weekday, index) => (
          <Text
            key={`${weekday}-${index}`}
            className="flex-1 text-center text-xs font-semibold text-label-tertiary capitalize"
          >
            {weekday}
          </Text>
        ))}
      </View>

      {/* Grade Mensal de Dias em Card Branco */}
      <View className="rounded-3xl bg-white p-3 shadow-sm border border-border-primary/20">
        {visibleWeeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} className="flex-row my-0.5">
            {week.map(day => {
              if (!day.isCurrentMonth) {
                return (
                  <View
                    key={day.date}
                    className="h-11 flex-1 m-0.5"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                );
              }

              const isSelected = day.date === selectedDate;
              const dayAppointments = appointmentsByDate[day.date] ?? [];
              const appCount = dayAppointments.length;
              const hasAppointments = appCount > 0;
              const dotCount = Math.min(appCount, 3);

              return (
                <Pressable
                  key={day.date}
                  testID={`calendar-day-${day.date}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.dayOfMonth} de ${monthLabel}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelectDate(day.date)}
                  className={cn(
                    'h-11 flex-1 items-center justify-center rounded-2xl m-0.5 relative',
                    isSelected && 'bg-details-tertiary',
                    !isSelected &&
                      hasAppointments &&
                      'bg-details-primary border border-border-primary/40',
                    !isSelected &&
                      !hasAppointments &&
                      'active:bg-details-primary/40',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm text-label-primary',
                      isSelected ? 'font-bold' : 'font-semibold',
                    )}
                  >
                    {day.dayOfMonth}
                  </Text>

                  {/* Marcador de agendamento (dots) */}
                  {hasAppointments && (
                    <View
                      testID={`appointment-dot-${day.date}`}
                      className="flex-row gap-0.5 absolute bottom-1.5 items-center justify-center"
                    >
                      {Array.from({ length: dotCount }, (_, i) => (
                        <View
                          key={i}
                          className="size-1 rounded-full bg-label-primary"
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
