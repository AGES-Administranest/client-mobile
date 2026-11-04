import {
  fromCalendarDate,
  isRangeComplete,
  type CalendarRange,
} from 'shared/utils/calendar';

export type ReportKind = 'general' | 'invoicePackage';

export type ReportPeriodShortcut =
  | 'currentMonth'
  | 'previousMonth'
  | 'currentYear';

export type ReportPeriodChoice = ReportPeriodShortcut | 'custom';

export const REPORT_PERIOD_CHOICES: readonly ReportPeriodChoice[] = [
  'currentMonth',
  'previousMonth',
  'currentYear',
  'custom',
];

// The clinic's calendar is Brazilian: "today" must not slip to the next day
// when the device is set to another zone or the instant is past 21:00 there.
const REPORT_TIME_ZONE = 'America/Sao_Paulo';

type CalendarDay = { year: number; month: number; day: number };

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function toCalendarString({ year, month, day }: CalendarDay): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function todayInReportTimeZone(now: Date): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find(candidate => candidate.type === type)?.value);

  return { year: part('year'), month: part('month'), day: part('day') };
}

export function reportPeriodFor(
  shortcut: ReportPeriodShortcut,
  now: Date,
): CalendarRange {
  const today = todayInReportTimeZone(now);

  if (shortcut === 'currentMonth') {
    return {
      from: toCalendarString({ ...today, day: 1 }),
      to: toCalendarString(today),
    };
  }

  if (shortcut === 'currentYear') {
    return {
      from: toCalendarString({ year: today.year, month: 1, day: 1 }),
      to: toCalendarString(today),
    };
  }

  const isJanuary = today.month === 1;
  const year = isJanuary ? today.year - 1 : today.year;
  const month = isJanuary ? 12 : today.month - 1;

  return {
    from: toCalendarString({ year, month, day: 1 }),
    to: toCalendarString({ year, month, day: daysInMonth(year, month) }),
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
