import { useTranslation } from 'shared/i18n';

import {
  historyPeriodLabel,
  historyRowView,
  historyShowMoreLabel,
  historyTotalsView,
} from './clinicHistoryPresenter';
import { ClinicHistory } from '../components/ClinicHistory';
import { HistoryPeriodField } from '../components/HistoryPeriodField';
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
      totals={historyTotalsView(history.summary, t, locale)}
      rows={history.appointments.map(appointment =>
        historyRowView(appointment, t, locale),
      )}
      showMoreLabel={historyShowMoreLabel(history, t, locale)}
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
          periodLabel={historyPeriodLabel(
            picker.isOpen ? picker.draft : history.period,
            t,
            locale,
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
