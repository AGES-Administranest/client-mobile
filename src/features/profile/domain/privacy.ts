import { toCalendarDate } from 'shared/utils/calendar';

export function formatAcceptanceDate(acceptedAt: string | null): string | null {
  if (!acceptedAt) {
    return null;
  }

  const date = new Date(acceptedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const [year, month, day] = toCalendarDate(date).split('-');
  return `${day}/${month}/${year}`;
}
