import { useMemo, useState } from 'react';

import { Card } from 'app/components/ui/card';
import { MonthSelector } from 'shared/components/MonthSelector';
import { useTranslation } from 'shared/i18n';

import {
  currentValueView,
  evolutionCardView,
  monthRowView,
  windowCaption,
  windowRange,
} from './hourlyRateHistoryPresenter';
import { HourlyRateChartPlaceholder } from '../components/HourlyRateChartPlaceholder';
import { HourlyRateEvolutionCard } from '../components/HourlyRateEvolutionCard';
import { HourlyRateHistoryHighlight } from '../components/HourlyRateHistoryHighlight';
import { HourlyRateMonthsCard } from '../components/HourlyRateMonthsCard';
import { HourlyRateNote } from '../components/HourlyRateNote';
import {
  HISTORY_WINDOW_SIZE,
  monthKey,
  splitIntoWindows,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';

const MIN_MONTHS_FOR_CHART = 2;

type HourlyRateHistoryViewProps = {
  // Newest first, never empty.
  rows: HourlyRateHistoryRow[];
  safetyMarginPct: number | null;
  onShowAll: () => void;
};

export function HourlyRateHistoryView({
  rows,
  safetyMarginPct,
  onShowAll,
}: HourlyRateHistoryViewProps) {
  const { t, locale } = useTranslation();
  const format = { t, locale };
  const windows = useMemo(() => splitIntoWindows(rows), [rows]);
  const [windowIndex, setWindowIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const windowRows = windows[windowIndex];
  const hasChart = rows.length >= MIN_MONTHS_FOR_CHART;
  const hasWindows = rows.length > HISTORY_WINDOW_SIZE;
  // Until a row is tapped, the newest month of the window is the one in focus.
  const selectedId =
    pickedId ?? (hasChart ? monthKey(windowRows[0].rate.month) : null);
  const today = new Date();

  const moveTo = (index: number) => {
    setWindowIndex(index);
    setPickedId(null);
  };

  return (
    <>
      {hasWindows ? (
        <Card className="rounded-[14px] px-4 py-3 shadow-[0px_5px_5px_rgba(0,0,0,0.1)]">
          <MonthSelector
            label={windowRange(windowRows, format)}
            caption={windowCaption(windowIndex, format)}
            previousLabel={t('pricing.history.period.previousButton')}
            nextLabel={t('pricing.history.period.nextButton')}
            previousDisabled={windowIndex === windows.length - 1}
            nextDisabled={windowIndex === 0}
            onPrevious={() => moveTo(windowIndex + 1)}
            onNext={() => moveTo(windowIndex - 1)}
          />
        </Card>
      ) : null}

      <HourlyRateHistoryHighlight
        title={t('pricing.history.current.title')}
        {...currentValueView(rows, safetyMarginPct, format)}
      />

      {hasChart ? (
        <HourlyRateEvolutionCard
          {...evolutionCardView(windowRows, selectedId, setPickedId, format)}
        />
      ) : (
        <HourlyRateChartPlaceholder
          title={t('pricing.history.chart.title')}
          heading={t('pricing.history.chart.placeholderTitle')}
          message={t('pricing.history.chart.placeholderMessage', {
            count: MIN_MONTHS_FOR_CHART,
          })}
        />
      )}

      <HourlyRateMonthsCard
        title={t('pricing.history.months.title')}
        rows={windowRows.map(row => monthRowView(row, format, today))}
        selectedId={selectedId}
        onSelect={setPickedId}
        footerAction={
          hasWindows
            ? {
                label: t('pricing.history.months.viewAll', {
                  count: rows.length,
                }),
                onPress: onShowAll,
              }
            : undefined
        }
      />

      {hasWindows ? (
        <HourlyRateNote
          message={t('pricing.history.notes.overWindow', {
            count: HISTORY_WINDOW_SIZE,
          })}
        />
      ) : hasChart && rows.length < HISTORY_WINDOW_SIZE ? (
        <HourlyRateNote
          message={t('pricing.history.notes.underWindow', {
            count: HISTORY_WINDOW_SIZE,
          })}
        />
      ) : null}
    </>
  );
}
