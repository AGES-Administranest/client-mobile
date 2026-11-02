import {
  fromCalendarDate,
  isRangeComplete,
  toCalendarDate,
  type CalendarRange,
} from 'shared/utils/calendar';

export type ReportKind = 'general' | 'invoicePackage';

export function defaultReportPeriod(today: Date): CalendarRange {
  return {
    from: toCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toCalendarDate(today),
  };
}

export function isReportPeriodReady(range: CalendarRange): boolean {
  return isRangeComplete(range);
}

export function formatReportDate(calendarDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(
    fromCalendarDate(calendarDate),
  );
}
