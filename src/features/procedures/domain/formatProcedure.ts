import { formatDayAndMonth } from 'shared/utils/calendar';

const CURRENCY = 'BRL';

export function formatAppointmentAmount(
  amount: string | null,
  locale: string,
): string {
  if (amount === null || amount.trim() === '') {
    return '';
  }
  const value = Number(amount);

  return Number.isFinite(value)
    ? value.toLocaleString(locale, { style: 'currency', currency: CURRENCY })
    : '';
}

export function formatShortDate(startsAt: string, locale: string): string {
  return formatDayAndMonth(new Date(startsAt), locale, 'numeric');
}

// O backend guarda `asa` como texto livre: quem cadastrou "ASA II" fora do
// app não pode virar "ASA ASA II" no selo.
export function toAsaBadgeValue(asa: string | null): string | null {
  const value = (asa ?? '').replace(/^\s*asa\b\s*/i, '').trim();

  return value === '' ? null : value;
}
