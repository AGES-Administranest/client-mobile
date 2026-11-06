import type { useTranslation } from 'shared/i18n';
import { fromCalendarDate, type CalendarRange } from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import type {
  ClinicHistoryRow,
  ClinicHistoryTotals,
} from '../components/ClinicHistory';
import {
  formatHistoryAmount,
  type ClientAppointment,
  type ClientSummary,
} from '../domain/clientHistory';
import type { ClientHistoryState } from '../hooks/useClientHistory';

type Translate = ReturnType<typeof useTranslation>['t'];

function formatDay(calendarDate: string, locale: string): string {
  return fromCalendarDate(calendarDate).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function historyPeriodLabel(
  range: CalendarRange,
  t: Translate,
  locale: string,
): string {
  if (range.from === null) {
    return '';
  }
  if (range.to === null) {
    return formatDay(range.from, locale);
  }
  return t('clinics.history.periodRange', {
    from: formatDay(range.from, locale),
    to: formatDay(range.to, locale),
  });
}

export function historyRowView(
  appointment: ClientAppointment,
  t: Translate,
  locale: string,
): ClinicHistoryRow {
  const date = formatDayAndMonth(new Date(appointment.startsAt), locale);

  return {
    id: appointment.id,
    title: appointment.procedureName ?? t('clinics.history.noProcedure'),
    detail: appointment.patientName
      ? t('clinics.history.appointmentDetail', {
          patient: appointment.patientName,
          date,
        })
      : date,
    amount:
      appointment.amount === null
        ? t('clinics.history.noAmount')
        : formatHistoryAmount(appointment.amount, locale),
  };
}

export function historyTotalsView(
  summary: ClientSummary,
  t: Translate,
  locale: string,
): ClinicHistoryTotals {
  const { tripCount } = summary;

  return {
    billed: formatHistoryAmount(summary.billedTotal, locale),
    appointments: summary.appointmentsCount.toLocaleString(locale),
    tripCost: formatHistoryAmount(summary.tripCost, locale),
    tripCount:
      tripCount === 0
        ? t('clinics.history.tripCountZero')
        : tripCount === 1
        ? t('clinics.history.tripCountOne')
        : t('clinics.history.tripCountOther', {
            count: tripCount.toLocaleString(locale),
          }),
  };
}

export function historyShowMoreLabel(
  history: Pick<ClientHistoryState, 'remaining' | 'loadMoreFailed'>,
  t: Translate,
  locale: string,
): string | null {
  if (history.loadMoreFailed) {
    return t('clinics.history.showMoreFailed');
  }
  if (history.remaining === 0) {
    return null;
  }
  return history.remaining === 1
    ? t('clinics.history.showMoreOne')
    : t('clinics.history.showMoreOther', {
        count: history.remaining.toLocaleString(locale),
      });
}
