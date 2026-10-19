export interface ParsedDate {
  day: number;
  month: number;
  year: number;
}

export interface ParsedTime {
  hours: number;
  minutes: number;
}

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function parseMaskedDate(value: string): ParsedDate | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

export function parseMaskedTime(value: string): ParsedTime | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function isValidCalendarDate(
  day: number,
  month: number,
  year: number,
): boolean {
  if (year < 1000 || year > 9999) {
    return false;
  }
  if (month < 1 || month > 12) {
    return false;
  }
  // Date rolls over invalid days (e.g. 31/02) instead of throwing, so we
  // confirm the constructed date still matches what was asked for.
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidTimeOfDay(hours: number, minutes: number): boolean {
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function combineDateAndTime(
  dateValue: string,
  timeValue: string,
): Date | null {
  const date = parseMaskedDate(dateValue);
  const time = parseMaskedTime(timeValue);
  if (!date || !time) {
    return null;
  }
  if (!isValidCalendarDate(date.day, date.month, date.year)) {
    return null;
  }
  if (!isValidTimeOfDay(time.hours, time.minutes)) {
    return null;
  }
  return new Date(
    date.year,
    date.month - 1,
    date.day,
    time.hours,
    time.minutes,
    0,
    0,
  );
}
