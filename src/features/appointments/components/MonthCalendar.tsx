import { useMemo } from 'react';

import { useTranslation } from 'shared/i18n';

import { AppointmentCalendar } from './AppointmentCalendar';
import type { AppointmentsState } from '../hooks/useAppointments';

const FIRST_SUNDAY = new Date(2024, 0, 7);
const WEEK_LENGTH = 7;

type MonthCalendarProps = {
  controller: AppointmentsState;
  /** Overrides the controller's: null highlights no day. */
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  className?: string;
};

// The month grid with its locale labels, driven by a useAppointments controller.
export function MonthCalendar({
  controller,
  selectedDate = controller.selectedDate,
  onSelectDate = controller.onSelectDate,
  className,
}: MonthCalendarProps) {
  const { t, locale } = useTranslation();
  const { year, monthIndex } = controller;

  // Month label: "Agosto 2026" (per the mockup)
  const monthLabel = useMemo(() => {
    try {
      const monthName = new Intl.DateTimeFormat(locale, {
        month: 'long',
      }).format(new Date(year, monthIndex, 1));
      const capitalized =
        monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${capitalized} ${year}`;
    } catch {
      return `${year}-${monthIndex + 1}`;
    }
  }, [locale, year, monthIndex]);

  // Weekdays: "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"
  const weekdays = useMemo(() => {
    return Array.from({ length: WEEK_LENGTH }, (_, index) => {
      try {
        const raw = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
        }).format(
          new Date(
            FIRST_SUNDAY.getFullYear(),
            FIRST_SUNDAY.getMonth(),
            FIRST_SUNDAY.getDate() + index,
          ),
        );
        const clean = raw.replace('.', '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      } catch {
        return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][index];
      }
    });
  }, [locale]);

  return (
    <AppointmentCalendar
      year={year}
      monthIndex={monthIndex}
      selectedDate={selectedDate ?? ''}
      appointmentsByDate={controller.appointmentsByDate}
      monthLabel={monthLabel}
      weekdays={weekdays}
      previousMonthLabel={t('appointments.calendar.prevMonth')}
      nextMonthLabel={t('appointments.calendar.nextMonth')}
      onSelectDate={onSelectDate}
      onPreviousMonth={controller.onPreviousMonth}
      onNextMonth={controller.onNextMonth}
      className={className}
    />
  );
}
