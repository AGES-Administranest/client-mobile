import type { useTranslation } from 'shared/i18n';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

export type Translate = ReturnType<typeof useTranslation>['t'];

export type Format = { t: Translate; locale: string };

export function formatNumber(
  value: number,
  locale: string,
  fractionDigits: number,
): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: fractionDigits,
  });
}

// The month name as the locale writes it inside a sentence: "setembro" in
// pt-BR, "September" in en-US.
function monthName({ month, year }: MonthPeriod, locale: string): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
  });
}

// "outubro", "maio": always lowercase, as the chart's labels and tooltips
// write the months.
export function longMonthName(period: MonthPeriod, locale: string): string {
  return monthName(period, locale).toLowerCase();
}

// "Valores de setembro/2026": the caption under the month on the detail's
// card. It names the month itself, so it does not depend on today's date.
export function monthCaption(
  period: MonthPeriod,
  { t, locale }: Format,
): string {
  return t('pricing.history.detail.monthLabel', {
    month: monthName(period, locale),
    year: period.year,
  });
}
