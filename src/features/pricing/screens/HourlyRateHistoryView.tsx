import { useMemo } from 'react';

import { Card } from 'app/components/ui/card';
import { MonthSelector } from 'shared/components/MonthSelector';
import { useTranslation } from 'shared/i18n';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

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
  monthOfKey,
  splitIntoWindows,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';
import { clampWindowIndex } from '../domain/hourlyRateHistoryNavigation';

const MIN_MONTHS_FOR_CHART = 2;

type HourlyRateHistoryViewProps = {
  // Newest first, never empty.
  rows: HourlyRateHistoryRow[];
  safetyMarginPct: number | null;
  // Where the view stands lives in the screen, so it is as it was left when
  // a month's detail is closed.
  windowIndex: number;
  pickedId: string | null;
  // The index to go to and how many windows there are, for it to be kept
  // inside them.
  onChangeWindow: (index: number, windowCount: number) => void;
  // A point of the chart: selects the month, nothing opens.
  onPickMonth: (id: string) => void;
  // A row of the monthly card: opens that month's detail.
  onOpenMonth: (month: MonthPeriod) => void;
  onShowAll: () => void;
};

export function HourlyRateHistoryView({
  rows,
  safetyMarginPct,
  windowIndex,
  pickedId,
  onChangeWindow,
  onPickMonth,
  onOpenMonth,
  onShowAll,
}: HourlyRateHistoryViewProps) {
  const { t, locale } = useTranslation();
  const format = { t, locale };
  const windows = useMemo(() => splitIntoWindows(rows), [rows]);

  const windowIndexInRange = clampWindowIndex(windowIndex, windows.length);
  const windowRows = windows[windowIndexInRange];
  const hasChart = rows.length >= MIN_MONTHS_FOR_CHART;
  const hasWindows = rows.length > HISTORY_WINDOW_SIZE;
  // Until a row is tapped, the newest month of the window is the one in focus.
  const selectedId =
    pickedId ?? (hasChart ? monthKey(windowRows[0].rate.month) : null);
  const today = new Date();

  const openMonth = (id: string) => {
    const month = monthOfKey(windowRows, id);
    if (month) onOpenMonth(month);
  };

  return (
    <>
      {hasWindows ? (
        <Card className="rounded-[14px] px-4 py-3 shadow-[0px_5px_5px_rgba(0,0,0,0.1)]">
          <MonthSelector
            label={windowRange(windowRows, format)}
            caption={windowCaption(windowIndexInRange, format)}
            previousLabel={t('pricing.history.period.previousButton')}
            nextLabel={t('pricing.history.period.nextButton')}
            previousDisabled={windowIndexInRange === windows.length - 1}
            nextDisabled={windowIndexInRange === 0}
            onPrevious={() =>
              onChangeWindow(windowIndexInRange + 1, windows.length)
            }
            onNext={() =>
              onChangeWindow(windowIndexInRange - 1, windows.length)
            }
          />
        </Card>
      ) : null}

      <HourlyRateHistoryHighlight
        title={t('pricing.history.current.title')}
        {...currentValueView(rows, safetyMarginPct, format)}
      />

      {hasChart ? (
        <HourlyRateEvolutionCard
          {...evolutionCardView(windowRows, selectedId, onPickMonth, format)}
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
        onSelect={openMonth}
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
