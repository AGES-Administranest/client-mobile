import { useTranslation } from 'shared/i18n';

import {
  monthCountLabel,
  monthRowView,
  sinceStartView,
} from './hourlyRateHistoryPresenter';
import { HourlyRateHistoryHighlight } from '../components/HourlyRateHistoryHighlight';
import { HourlyRateMonthsCard } from '../components/HourlyRateMonthsCard';
import {
  groupByYear,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';

type HourlyRateAllMonthsViewProps = {
  // Newest first, never empty.
  rows: HourlyRateHistoryRow[];
};

// The rows do nothing for now: opening a month in the calculator depends on
// a decision still open on the task.
export function HourlyRateAllMonthsView({
  rows,
}: HourlyRateAllMonthsViewProps) {
  const { t, locale } = useTranslation();
  const format = { t, locale };
  const sinceStart = sinceStartView(rows, format);
  const today = new Date();

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
        />
      ))}
    </>
  );
}
