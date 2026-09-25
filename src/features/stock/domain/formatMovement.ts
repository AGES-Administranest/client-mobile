import { fromCalendarDate } from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { getSignedTotal, type StockMovement } from './stockMovement';

const CURRENCY = 'BRL';

function signOf(movement: StockMovement): string {
  return movement.type === 'inbound' ? '+' : '-';
}

export function formatSignedValue(
  movement: StockMovement,
  locale: string,
): string {
  const total = Math.abs(getSignedTotal(movement)).toLocaleString(locale, {
    style: 'currency',
    currency: CURRENCY,
  });

  return `${signOf(movement)}${total}`;
}

export function formatSignedQuantity(
  movement: StockMovement,
  locale: string,
): string {
  const amount = Math.abs(movement.quantity).toLocaleString(locale, {
    maximumFractionDigits: 3,
  });

  return `${signOf(movement)}${amount}`;
}

export function formatQuantity(
  movement: StockMovement,
  locale: string,
): string {
  return Math.abs(movement.quantity).toLocaleString(locale, {
    maximumFractionDigits: 3,
  });
}

export function formatMovementDate(occurredAt: string, locale: string): string {
  return formatDayAndMonth(new Date(occurredAt), locale);
}

export function formatCalendarDate(
  calendarDate: string,
  locale: string,
): string {
  return formatDayAndMonth(fromCalendarDate(calendarDate), locale);
}
