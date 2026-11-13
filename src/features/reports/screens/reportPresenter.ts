import type { useTranslation } from 'shared/i18n';
import { fromCalendarDate } from 'shared/utils/calendar';

import type { ReportHistoryItem } from '../domain/report.types';

type Translate = ReturnType<typeof useTranslation>['t'];

export type ReportCardView = {
  kind: string;
  period: string;
  generatedAt: string;
  fileName: string;
  downloadedLabel: string | null;
};

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
