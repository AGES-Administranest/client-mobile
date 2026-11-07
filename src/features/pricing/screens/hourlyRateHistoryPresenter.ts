import type { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';
import {
  formatMonthLabel,
  relativeMonth,
  type MonthPeriod,
} from 'shared/utils/monthPeriod';

import type { HourlyRateEvolutionCardProps } from '../components/HourlyRateEvolutionCard';
import type { HourlyRateHistoryHighlightProps } from '../components/HourlyRateHistoryHighlight';
import type { HourlyRateMonthRowProps } from '../components/HourlyRateMonthsCard';
import type { TrendChipProps } from '../components/TrendChip';
import { buildHourlyRateChart } from '../domain/hourlyRateChart';
import {
  HISTORY_WINDOW_SIZE,
  monthKey,
  summarizeSinceStart,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';

type Translate = ReturnType<typeof useTranslation>['t'];

type Format = { t: Translate; locale: string };

const MINUS = '−';

const decimal = (value: number, locale: string, fractionDigits: number) =>
  value.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

// "+2,4%" and "−1,4%" (a real minus sign, as the Figma draws it). The sign
// follows the rounded value, so a drop of 0,04% reads "0,0%", not "−0,0%".
export function formatChange(percent: number, locale: string): TrendChipProps {
  const rounded = Math.round(Math.abs(percent) * 10) / 10;
  const text = `${decimal(rounded, locale, 1)}%`;

  if (rounded === 0) return { tone: 'flat', label: text };
  return percent > 0
    ? { tone: 'up', label: `+${text}` }
    : { tone: 'down', label: `${MINUS}${text}` };
}

export function formatSignedCurrency(value: number, locale: string): string {
  const amount = formatCurrency(Math.abs(value), locale);
  if (Math.round(Math.abs(value) * 100) === 0) return amount;
  return `${value > 0 ? '+' : MINUS}${amount}`;
}

function shortMonth(period: MonthPeriod, locale: string): string {
  return new Date(period.year, period.month - 1, 1).toLocaleDateString(locale, {
    month: 'short',
  });
}

// "mai." in pt-BR: the label wants "Mai", no dot.
function shortMonthTitle(period: MonthPeriod, locale: string): string {
  const name = shortMonth(period, locale).replace('.', '');
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function sentenceMonth(period: MonthPeriod, locale: string): string {
  const label = formatMonthLabel(period, locale);
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

function number(value: number, locale: string, fractionDigits: number) {
  return value.toLocaleString(locale, {
    maximumFractionDigits: fractionDigits,
  });
}

// "Mai – Out 2026", or "Nov 2025 – Abr 2026" when the window crosses a year.
export function windowRange(
  window: readonly HourlyRateHistoryRow[],
  { t, locale }: Format,
): string {
  const newest = window[0].rate.month;
  const oldest = window[window.length - 1].rate.month;

  if (window.length === 1) {
    return t('pricing.history.period.single', {
      month: shortMonthTitle(newest, locale),
      year: newest.year,
    });
  }
  if (newest.year === oldest.year) {
    return t('pricing.history.period.sameYear', {
      from: shortMonthTitle(oldest, locale),
      to: shortMonthTitle(newest, locale),
      year: newest.year,
    });
  }
  return t('pricing.history.period.crossYear', {
    from: shortMonthTitle(oldest, locale),
    fromYear: oldest.year,
    to: shortMonthTitle(newest, locale),
    toYear: newest.year,
  });
}

export function windowCaption(windowIndex: number, { t }: Format): string {
  return t(
    windowIndex === 0
      ? 'pricing.history.period.latest'
      : 'pricing.history.period.earlier',
    { count: HISTORY_WINDOW_SIZE },
  );
}

export function monthRowView(
  { rate, variation, isOldest }: HourlyRateHistoryRow,
  { t, locale }: Format,
  today: Date,
): HourlyRateMonthRowProps {
  const label = formatMonthLabel(rate.month, locale);
  const value = formatCurrency(rate.hourlyRate, locale);
  const trend = variation === null ? null : formatChange(variation, locale);
  const caption = isOldest ? t('pricing.history.months.oldest') : null;

  return {
    id: monthKey(rate.month),
    label,
    currentChip:
      relativeMonth(rate.month, today) === 'current'
        ? t('pricing.history.months.currentChip')
        : null,
    value,
    trend,
    caption,
    accessibilityLabel: [
      t('pricing.history.months.rowLabel', { month: label, value }),
      trend?.label ?? caption,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

// "a **b** c" into its three passages; the middle one is the semibold part.
function splitEmphasis(
  text: string,
): HourlyRateHistoryHighlightProps['summary'] {
  const [lead, strong, tail] = text.split('**');
  return { lead, strong, tail };
}

// The card of the newest month. `rows` is newest first and not empty.
export function currentValueView(
  rows: readonly HourlyRateHistoryRow[],
  safetyMarginPct: number | null,
  { t, locale }: Format,
): Pick<
  HourlyRateHistoryHighlightProps,
  'marginLabel' | 'value' | 'trend' | 'summary'
> {
  const [latest, previous] = rows;
  const oldest = rows[rows.length - 1].rate;
  const sinceStart = summarizeSinceStart(rows);

  return {
    marginLabel:
      safetyMarginPct === null
        ? undefined
        : t('pricing.hourlyRate.marginChip', {
            margin: number(safetyMarginPct, locale, 2),
          }),
    value: formatCurrency(latest.rate.hourlyRate, locale),
    trend:
      latest.variation === null || !previous
        ? null
        : {
            tone: formatChange(latest.variation, locale).tone,
            label: t('pricing.history.current.variationChip', {
              variation: formatChange(latest.variation, locale).label,
              month: shortMonth(previous.rate.month, locale),
            }),
          },
    summary: sinceStart
      ? splitEmphasis(
          t('pricing.history.current.sinceStart', {
            month: `${shortMonth(oldest.month, locale).replace('.', '')}/${
              oldest.month.year
            }`,
            difference: formatSignedCurrency(sinceStart.difference, locale),
            percent: formatChange(sinceStart.percent, locale).label,
          }),
        )
      : {
          lead: t('pricing.history.current.firstMonth', {
            month: sentenceMonth(latest.rate.month, locale),
          }),
        },
  };
}

export function allMonthsHeader(
  rows: readonly HourlyRateHistoryRow[],
  { t, locale }: Format,
): string {
  return t('pricing.history.all.subtitle', {
    count: rows.length,
    month: sentenceMonth(rows[rows.length - 1].rate.month, locale),
  });
}

// The card of the whole history: what the rate gained or lost since the
// oldest month. `rows` has at least two months.
export function sinceStartView(
  rows: readonly HourlyRateHistoryRow[],
  { t, locale }: Format,
): Pick<HourlyRateHistoryHighlightProps, 'value' | 'trend' | 'summary'> | null {
  const sinceStart = summarizeSinceStart(rows);
  if (!sinceStart) return null;

  return {
    value: formatSignedCurrency(sinceStart.difference, locale),
    trend: formatChange(sinceStart.percent, locale),
    summary: {
      lead: t('pricing.history.all.sinceStartText', {
        from: formatCurrency(sinceStart.from.hourlyRate, locale),
        fromMonth: sentenceMonth(sinceStart.from.month, locale),
        to: formatCurrency(sinceStart.to.hourlyRate, locale),
        toMonth: sentenceMonth(sinceStart.to.month, locale),
      }),
    },
  };
}

export function monthCountLabel(count: number, { t }: Format): string {
  return t(
    count === 1
      ? 'pricing.history.all.monthCount.one'
      : 'pricing.history.all.monthCount.other',
    { count },
  );
}

// "set", "mai": the short name as a sentence has it, no capital and no dot.
function shortMonthName(period: MonthPeriod, locale: string): string {
  return shortMonth(period, locale).replace('.', '').toLowerCase();
}

// "outubro", "maio".
function longMonthName(period: MonthPeriod, locale: string): string {
  return new Date(period.year, period.month - 1, 1)
    .toLocaleDateString(locale, { month: 'long' })
    .toLowerCase();
}

// "+2,4% vs set": the change of a month against the one before it on record.
function tooltipChange(
  { variation, previousMonth }: HourlyRateHistoryRow,
  { t, locale }: Format,
): { label: string; tone: TrendChipProps['tone'] } | null {
  if (variation === null || previousMonth === null) return null;

  const change = formatChange(variation, locale);
  return {
    tone: change.tone,
    label: t('pricing.history.chart.tooltipChange', {
      change: change.label,
      month: shortMonthName(previousMonth, locale),
    }),
  };
}

function pointAccessibilityLabel(
  row: HourlyRateHistoryRow,
  { t, locale }: Format,
): string {
  const month = formatMonthLabel(row.rate.month, locale);
  const value = formatCurrency(row.rate.hourlyRate, locale);
  if (row.variation === null || row.previousMonth === null) {
    return t('pricing.history.chart.pointLabel', { month, value });
  }

  return t('pricing.history.chart.pointLabelWithChange', {
    month,
    value,
    change: formatChange(row.variation, locale).label,
    previous: longMonthName(row.previousMonth, locale),
  });
}

// The evolution card of a window of the history. `windowRows` come newest
// first and have at least two months.
export function evolutionCardView(
  windowRows: readonly HourlyRateHistoryRow[],
  selectedId: string | null,
  onSelect: (id: string) => void,
  format: Format,
): HourlyRateEvolutionCardProps {
  const { t, locale } = format;
  const chart = buildHourlyRateChart(windowRows);
  const rowById = new Map(
    windowRows.map(row => [monthKey(row.rate.month), row]),
  );
  const selectedRow = selectedId ? rowById.get(selectedId) : undefined;
  const oldest = windowRows[windowRows.length - 1].rate.month;
  const newest = windowRows[0].rate.month;
  const isShortWindow = windowRows.length < HISTORY_WINDOW_SIZE;

  const stat = (
    label: 'average' | 'highest' | 'lowest',
    value: number,
    caption: string,
  ) => ({
    label: t(`pricing.history.chart.summary.${label}`),
    value: formatCurrency(value, locale),
    caption,
  });

  return {
    title: isShortWindow
      ? t('pricing.history.chart.titleWithCount', { count: windowRows.length })
      : t('pricing.history.chart.title'),
    periodChange:
      chart.change === null
        ? null
        : (() => {
            const change = formatChange(chart.change, locale);
            return {
              tone: change.tone,
              label: t('pricing.history.chart.periodChange', {
                change: change.label,
              }),
            };
          })(),
    legend: t('pricing.history.chart.legendRate'),
    chart: {
      points: chart.points.map(point => {
        const row = rowById.get(point.id) as HourlyRateHistoryRow;
        return {
          id: point.id,
          x: point.x,
          y: point.y,
          secondaryY: point.secondaryY,
          label: shortMonthTitle(row.rate.month, locale),
          accessibilityLabel: pointAccessibilityLabel(row, format),
        };
      }),
      ticks: chart.ticks.map(tick => ({
        y: tick.y,
        label: formatCurrency(tick.value, locale, { showCents: false }),
      })),
      selectedId,
      tooltip: selectedRow
        ? {
            month: formatMonthLabel(selectedRow.rate.month, locale),
            value: t('pricing.history.chart.tooltipValue', {
              value: formatCurrency(selectedRow.rate.hourlyRate, locale),
            }),
            change: tooltipChange(selectedRow, format),
          }
        : null,
      onSelect,
    },
    stats: [
      stat(
        'average',
        chart.average,
        isShortWindow
          ? t('pricing.history.chart.summary.averageCount', {
              count: windowRows.length,
            })
          : t('pricing.history.chart.summary.averageRange', {
              from: shortMonthName(oldest, locale),
              to: shortMonthName(newest, locale),
            }),
      ),
      stat(
        'highest',
        chart.highest.rate.hourlyRate,
        longMonthName(chart.highest.rate.month, locale),
      ),
      stat(
        'lowest',
        chart.lowest.rate.hourlyRate,
        longMonthName(chart.lowest.rate.month, locale),
      ),
    ],
  };
}
