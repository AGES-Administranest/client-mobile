import type { Format } from './presenterCommon';
import type { HourlyRateGoalsCardProps } from '../components/HourlyRateGoalsCard';
import type { HourlyRate } from '../domain/hourlyRate';

// Plain numbers, as the Figma "Metas" card shows them (8000, 30, 20): the
// units are in the labels.
const plain = (value: number, locale: string) =>
  value.toLocaleString(locale, {
    useGrouping: false,
    maximumFractionDigits: 2,
  });

// The goals the month was calculated with, not the current ones.
export function goalsView(
  { settings }: HourlyRate,
  { t, locale }: Format,
): HourlyRateGoalsCardProps {
  return {
    title: t('pricing.goalForm.title'),
    rows: [
      {
        label: t('pricing.goalForm.labels.monthlyIncomeGoal'),
        value: plain(settings.monthlyIncomeGoal, locale),
      },
      {
        label: t('pricing.goalForm.labels.weeklyHours'),
        value: plain(settings.weeklyHours, locale),
      },
      {
        label: t('pricing.goalForm.labels.safetyMarginPct'),
        value: plain(settings.safetyMarginPct, locale),
      },
    ],
  };
}
