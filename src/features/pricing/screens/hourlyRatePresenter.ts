import { formatCurrency } from 'shared/utils/currency';

import { formatNumber, type Format } from './presenterCommon';
import type { HourlyRateBreakdownRow } from '../components/HourlyRateBreakdown';
import type { HourlyRateHighlightProps } from '../components/HourlyRateHighlight';
import {
  HOURLY_RATE_PARTS,
  percentShares,
  shareOfTotal,
  type HourlyRate,
} from '../domain/hourlyRate';

// The texts of the "Valor da sua hora" card that come from the month's own
// calculation. The toggle, the refresh state and the shortcut are the
// screen's.
export function hourlyRateHighlightView(
  hourlyRate: HourlyRate,
  { t, locale }: Format,
): Pick<
  HourlyRateHighlightProps,
  | 'title'
  | 'marginLabel'
  | 'value'
  | 'valueAccessibilityLabel'
  | 'description'
  | 'minimum'
  | 'productiveHours'
  | 'updatedAt'
  | 'refreshingLabel'
> {
  const money = (value: number) => formatCurrency(value, locale);
  const calculatedAt = new Date(hourlyRate.calculatedAt);

  return {
    title: t('pricing.hourlyRate.title'),
    marginLabel: t('pricing.hourlyRate.marginChip', {
      margin: formatNumber(hourlyRate.settings.safetyMarginPct, locale, 2),
    }),
    value: money(hourlyRate.hourlyRate),
    valueAccessibilityLabel: t('pricing.hourlyRate.valueLabel', {
      value: money(hourlyRate.hourlyRate),
    }),
    description: t('pricing.hourlyRate.description'),
    minimum: {
      label: t('pricing.hourlyRate.minimum'),
      value: money(hourlyRate.minimumHourlyRate),
    },
    productiveHours: {
      label: t('pricing.hourlyRate.productiveHours'),
      value: t('pricing.hourlyRate.hoursValue', {
        hours: formatNumber(hourlyRate.productiveHours, locale, 1),
      }),
    },
    updatedAt: t('pricing.hourlyRate.updatedAt', {
      date: calculatedAt.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: calculatedAt.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }),
    refreshingLabel: t('pricing.hourlyRate.refreshing'),
  };
}

export function hourlyRateBreakdownRows(
  hourlyRate: HourlyRate,
  { t, locale }: Format,
): HourlyRateBreakdownRow[] {
  const margin = formatNumber(hourlyRate.settings.safetyMarginPct, locale, 2);
  const percents = percentShares(
    HOURLY_RATE_PARTS.map(part => hourlyRate.parts[part]),
  );

  return HOURLY_RATE_PARTS.map((part, index) => ({
    part,
    label: t(`pricing.hourlyRate.breakdown.parts.${part}.label`),
    caption: t(`pricing.hourlyRate.breakdown.parts.${part}.caption`, {
      margin,
    }),
    value: formatCurrency(hourlyRate.parts[part], locale),
    share: shareOfTotal(hourlyRate.parts[part], hourlyRate.total),
    shareLabel: t('pricing.hourlyRate.breakdown.shareOfTotal', {
      share: percents[index].toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    }),
  }));
}
