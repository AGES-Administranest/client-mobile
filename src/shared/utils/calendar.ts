export type CalendarRange = {
  from: string | null;
  to: string | null;
};

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

export const EMPTY_CALENDAR_RANGE: CalendarRange = { from: null, to: null };

const WEEK_LENGTH = 7;
const WEEKS_IN_GRID = 6;

export function toCalendarDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function fromCalendarDate(calendarDate: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
): CalendarDay[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - firstOfMonth.getDay());

  return Array.from({ length: WEEKS_IN_GRID * WEEK_LENGTH }, (_, offset) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
    );

    return {
      date: toCalendarDate(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth:
        date.getMonth() === monthIndex && date.getFullYear() === year,
    };
  });
}

export function addMonths(
  year: number,
  monthIndex: number,
  amount: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + amount, 1);

  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function isWithinCalendarRange(
  date: string,
  { from, to }: CalendarRange,
): boolean {
  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

export function isRangeComplete(range: CalendarRange): boolean {
  return range.from !== null && range.to !== null;
}

export function selectRangeDay(
  range: CalendarRange,
  day: string,
): CalendarRange {
  if (range.from === null || isRangeComplete(range)) {
    return { from: day, to: null };
  }

  if (day < range.from) {
    return { from: day, to: range.from };
  }

  return { from: range.from, to: day };
}

export function formatDayAndMonth(
  date: Date,
  locale: string,
  dayStyle: 'numeric' | '2-digit' = '2-digit',
): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: dayStyle,
    month: 'short',
  }).format(date);

  return formatted.replace(' de ', ' ').replace(/\.$/, '');
}

export function formatCalendarDate(
  calendarDate: string,
  locale: string,
): string {
  return formatDayAndMonth(fromCalendarDate(calendarDate), locale);
}
