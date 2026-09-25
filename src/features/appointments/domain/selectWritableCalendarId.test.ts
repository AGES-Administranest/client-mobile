import {
  selectWritableCalendarId,
  type CalendarSummary,
} from './selectWritableCalendarId';

test('returns null when there are no calendars', () => {
  expect(selectWritableCalendarId([])).toBeNull();
});

test('returns null when no calendar allows modifications', () => {
  const calendars: CalendarSummary[] = [
    { id: 'read-only-1', allowsModifications: false },
    { id: 'read-only-2', allowsModifications: false, isPrimary: true },
  ];

  expect(selectWritableCalendarId(calendars)).toBeNull();
});

test('returns the only writable calendar when there is no primary', () => {
  const calendars: CalendarSummary[] = [
    { id: 'read-only', allowsModifications: false },
    { id: 'writable', allowsModifications: true },
  ];

  expect(selectWritableCalendarId(calendars)).toBe('writable');
});

test('prefers the primary calendar even when it is not first', () => {
  const calendars: CalendarSummary[] = [
    { id: 'writable-1', allowsModifications: true },
    { id: 'writable-primary', allowsModifications: true, isPrimary: true },
    { id: 'writable-2', allowsModifications: true },
  ];

  expect(selectWritableCalendarId(calendars)).toBe('writable-primary');
});

test('falls back to the first writable calendar when none is primary', () => {
  const calendars: CalendarSummary[] = [
    { id: 'writable-1', allowsModifications: true },
    { id: 'writable-2', allowsModifications: true },
  ];

  expect(selectWritableCalendarId(calendars)).toBe('writable-1');
});
