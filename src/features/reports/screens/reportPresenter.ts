import type { useTranslation } from 'shared/i18n';
import { fromCalendarDate } from 'shared/utils/calendar';

import type { ReportHistoryItem } from '../domain/report.types';
import { toFileSize } from '../domain/reportHistory';

type Translate = ReturnType<typeof useTranslation>['t'];

export type ReportCardView = {
  kind: string;
  period: string;
  generatedAt: string;
  fileName: string;
  downloadedLabel: string | null;
};

export type ReportDetailRow = { label: string; value: string };

function formatDay(calendarDate: string, locale: string): string {
  return fromCalendarDate(calendarDate).toLocaleDateString(locale);
}

export function formatReportPeriod(
  report: ReportHistoryItem,
  t: Translate,
  locale: string,
): string {
  if (!report.period) {
    return t('reports.history.noPeriod');
  }

  return t('reports.history.period', {
    from: formatDay(report.period.from, locale),
    to: formatDay(report.period.to, locale),
  });
}

function formatGeneratedAt(generatedAt: string, locale: string): string {
  return new Date(generatedAt).toLocaleDateString(locale);
}

function formatSize(bytes: number | null, t: Translate, locale: string) {
  if (bytes === null) {
    return t('reports.history.notInformed');
  }

  const size = toFileSize(bytes);
  const value = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(size.value);

  return `${value} ${size.unit}`;
}

export function reportFileName(report: ReportHistoryItem, t: Translate) {
  return report.fileName ?? t('reports.history.untitled');
}

export function reportCardView(
  report: ReportHistoryItem,
  isDownloaded: boolean,
  t: Translate,
  locale: string,
): ReportCardView {
  return {
    kind: t(`reports.kinds.${report.kind}`),
    period: formatReportPeriod(report, t, locale),
    generatedAt: t('reports.history.generatedAt', {
      date: formatGeneratedAt(report.generatedAt, locale),
    }),
    fileName: reportFileName(report, t),
    downloadedLabel: isDownloaded ? t('reports.history.downloaded') : null,
  };
}

export function reportDetailRows(
  report: ReportHistoryItem,
  t: Translate,
  locale: string,
): ReportDetailRow[] {
  return [
    {
      label: t('reports.detail.kind'),
      value: t(`reports.kinds.${report.kind}`),
    },
    {
      label: t('reports.detail.period'),
      value: formatReportPeriod(report, t, locale),
    },
    {
      label: t('reports.detail.generatedAt'),
      value: formatGeneratedAt(report.generatedAt, locale),
    },
    { label: t('reports.detail.fileName'), value: reportFileName(report, t) },
    {
      label: t('reports.detail.size'),
      value: formatSize(report.fileBytesSize, t, locale),
    },
  ];
}
