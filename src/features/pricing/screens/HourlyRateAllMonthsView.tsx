import { useTranslation } from 'shared/i18n';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import {
  monthCountLabel,
  monthRowView,
  sinceStartView,
} from './hourlyRateHistoryPresenter';
import { HourlyRateHistoryHighlight } from '../components/HourlyRateHistoryHighlight';
import { HourlyRateMonthsCard } from '../components/HourlyRateMonthsCard';
import { HourlyRateNote } from '../components/HourlyRateNote';
import {
  groupByYear,
  monthOfKey,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';

type HourlyRateAllMonthsViewProps = {
  // Newest first, never empty.
  rows: HourlyRateHistoryRow[];
  onOpenMonth: (month: MonthPeriod) => void;
};

export function HourlyRateAllMonthsView({
  rows,
  onOpenMonth,
}: HourlyRateAllMonthsViewProps) {
  const { t, locale } = useTranslation();
  const format = { t, locale };
  const sinceStart = sinceStartView(rows, format);
  const today = new Date();
  const openMonth = (id: string) => {
    const month = monthOfKey(rows, id);
    if (month) onOpenMonth(month);
  };

  return (
    <>
      {sinceStart ? (
        <HourlyRateHistoryHighlight
          title={t('pricing.history.all.sinceStartTitle')}
          valueSize="medium"
          {...sinceStart}
        />
      ) : null}

      {groupByYear(rows).map(group => (
        <HourlyRateMonthsCard
          key={group.year}
          title={String(group.year)}
          titleCaption={monthCountLabel(group.rows.length, format)}
          titleVariant="year"
          rows={group.rows.map(row => monthRowView(row, format, today))}
          onSelect={openMonth}
        />
      ))}

      <HourlyRateNote message={t('pricing.history.all.note')} />
    </>
  );
}
