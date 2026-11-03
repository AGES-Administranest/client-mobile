import { useTranslation } from 'shared/i18n';
import { fromCalendarDate, type CalendarRange } from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ClinicHistory } from '../components/ClinicHistory';
import { HistoryPeriodField } from '../components/HistoryPeriodField';
import {
  formatHistoryAmount,
  type ClientAppointment,
} from '../domain/clientHistory';
import type { ClientHistoryState } from '../hooks/useClientHistory';
import type { HistoryPeriodPickerState } from '../hooks/useHistoryPeriodPicker';

type ClinicHistorySectionProps = {
  history: ClientHistoryState;
  picker: HistoryPeriodPickerState;
};

export function ClinicHistorySection({
  history,
  picker,
}: ClinicHistorySectionProps) {
  const { t, locale } = useTranslation();

  const formatAmount = (value: number) => formatHistoryAmount(value, locale);

  const formatDay = (calendarDate: string) =>
    fromCalendarDate(calendarDate).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const periodLabel = (range: CalendarRange) => {
    if (range.from === null) {
      return '';
    }
    if (range.to === null) {
      return formatDay(range.from);
    }
    return t('clinics.history.periodRange', {
      from: formatDay(range.from),
      to: formatDay(range.to),
    });
  };

  const toRow = (appointment: ClientAppointment) => {
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
          : formatAmount(appointment.amount),
    };
  };

  const { tripCount } = history.summary;
  const tripCountLabel =
    tripCount === 0
      ? t('clinics.history.tripCountZero')
      : tripCount === 1
      ? t('clinics.history.tripCountOne')
      : t('clinics.history.tripCountOther', { count: tripCount });

  const showMoreLabel = history.loadMoreFailed
    ? t('clinics.history.showMoreFailed')
    : history.remaining === 0
    ? null
    : history.remaining === 1
    ? t('clinics.history.showMoreOne')
    : t('clinics.history.showMoreOther', { count: history.remaining });

  return (
    <ClinicHistory
      texts={{
        billed: t('clinics.history.billed'),
        appointments: t('clinics.history.appointments'),
        trips: t('clinics.history.trips'),
        listTitle: t('clinics.history.listTitle'),
        loading: t('clinics.history.loading'),
        loadingMore: t('clinics.history.loadingMore'),
        emptyTitle: t('clinics.history.empty.title'),
        emptyMessage: t('clinics.history.empty.message'),
        retry: t('common.retry'),
      }}
      status={history.status}
      failureMessage={history.failure && t(history.failure)}
      totals={{
        billed: formatAmount(history.summary.billedTotal),
        appointments: String(history.summary.appointmentsCount),
        tripCost: formatAmount(history.summary.tripCost),
        tripCount: tripCountLabel,
      }}
      rows={history.appointments.map(toRow)}
      showMoreLabel={showMoreLabel}
      isLoadingMore={history.isLoadingMore}
      onShowMore={history.loadMore}
      onRetry={history.reload}
      periodField={
        <HistoryPeriodField
          texts={{
            label: t('clinics.history.period'),
            choosePeriod: t('clinics.history.choosePeriod'),
            previousMonth: t('clinics.history.previousMonth'),
            nextMonth: t('clinics.history.nextMonth'),
            currentMonth: t('clinics.history.currentMonth'),
            apply: t('clinics.history.apply'),
          }}
          locale={locale}
          periodLabel={periodLabel(
            picker.isOpen ? picker.draft : history.period,
          )}
          isOpen={picker.isOpen}
          draft={picker.draft}
          canApply={picker.canApply}
          onToggle={picker.toggle}
          onChoose={picker.choose}
          onShowCurrentMonth={picker.showCurrentMonth}
          onApply={picker.apply}
        />
      }
    />
  );
}
