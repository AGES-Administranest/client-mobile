import { ChartLine } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';
import { MonthSelectorPeriod } from 'shared/components/MonthSelector';
import { useTranslation } from 'shared/i18n';
import { formatMonthLabel, type MonthPeriod } from 'shared/utils/monthPeriod';

import { goalsView } from './hourlyRateMonthDetailPresenter';
import {
  hourlyRateBreakdownRows,
  hourlyRateHighlightView,
} from './hourlyRatePresenter';
import { monthCaption } from './presenterCommon';
import { HourlyRateBreakdown } from '../components/HourlyRateBreakdown';
import { HourlyRateGoalsCard } from '../components/HourlyRateGoalsCard';
import { HourlyRateHighlight } from '../components/HourlyRateHighlight';
import { HourlyRateLoadFailure } from '../components/HourlyRateLoadFailure';
import type { HourlyRate } from '../domain/hourlyRate';
import { useHourlyRateMonthDetail } from '../hooks/useHourlyRateMonthDetail';

type HourlyRateMonthDetailViewProps = {
  month: MonthPeriod;
};

// A month of the history, read-only: the calculator's cards with the stored
// calculation and the goals it used. Nothing here reads or writes the current
// configuration.
export function HourlyRateMonthDetailView({
  month,
}: HourlyRateMonthDetailViewProps) {
  const { t, locale } = useTranslation();
  const { state, reload } = useHourlyRateMonthDetail(month);

  return (
    <>
      <Card className="rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
        <MonthSelectorPeriod
          label={formatMonthLabel(month, locale)}
          caption={monthCaption(month, { t, locale })}
        />
      </Card>

      {state.status === 'loading' ? (
        <View
          accessibilityLabel={t('pricing.history.loading')}
          className="items-center py-10"
        >
          <ActivityIndicator />
        </View>
      ) : state.status === 'notFound' ? (
        <EmptyState
          icon={ChartLine}
          title={t('pricing.history.empty.title')}
          message={t('pricing.history.empty.message')}
        />
      ) : state.status === 'error' ? (
        <HourlyRateLoadFailure
          message={t('pricing.history.loadFailure')}
          retryLabel={t('common.retry')}
          onRetry={reload}
        />
      ) : (
        <MonthDetailContent hourlyRate={state.hourlyRate} />
      )}
    </>
  );
}

function MonthDetailContent({ hourlyRate }: { hourlyRate: HourlyRate }) {
  const { t, locale } = useTranslation();
  const format = { t, locale };
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      <HourlyRateHighlight
        {...hourlyRateHighlightView(hourlyRate, format)}
        isRefreshing={false}
        toggleLabel={t(
          isExpanded
            ? 'pricing.hourlyRate.hideBreakdown'
            : 'pricing.hourlyRate.showBreakdown',
        )}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(expanded => !expanded)}
      >
        <HourlyRateBreakdown
          title={t('pricing.hourlyRate.breakdown.title')}
          rows={hourlyRateBreakdownRows(hourlyRate, format)}
          explanationTitle={t('pricing.hourlyRate.breakdown.explanationTitle')}
          explanation={t('pricing.hourlyRate.breakdown.explanation')}
        />
      </HourlyRateHighlight>

      <HourlyRateGoalsCard {...goalsView(hourlyRate, format)} />
    </>
  );
}
