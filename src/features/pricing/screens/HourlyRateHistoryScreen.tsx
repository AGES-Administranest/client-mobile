import { ChartLine, RotateCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { HourlyRateAllMonthsView } from './HourlyRateAllMonthsView';
import { allMonthsHeader } from './hourlyRateHistoryPresenter';
import { HourlyRateHistoryView } from './HourlyRateHistoryView';
import { PricingScreenFrame } from '../components/PricingScreenFrame';
import { PricingScreenHeader } from '../components/PricingScreenHeader';
import { useHourlyRateHistory } from '../hooks/useHourlyRateHistory';

type HourlyRateHistoryScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function HourlyRateHistoryScreen({
  visible,
  onClose,
}: HourlyRateHistoryScreenProps) {
  const [isAllMonths, setIsAllMonths] = useState(false);

  useEffect(() => {
    if (visible) setIsAllMonths(false);
  }, [visible]);

  const goBack = isAllMonths ? () => setIsAllMonths(false) : onClose;

  return (
    <PricingScreenFrame visible={visible} onRequestClose={goBack}>
      <HourlyRateHistoryContent
        isAllMonths={isAllMonths}
        onShowAll={() => setIsAllMonths(true)}
        onBack={goBack}
      />
    </PricingScreenFrame>
  );
}

type HourlyRateHistoryContentProps = {
  isAllMonths: boolean;
  onShowAll: () => void;
  onBack: () => void;
};

// Lives inside the Modal, so each opening fetches once and "Todos os meses"
// reads the same rows instead of asking again.
function HourlyRateHistoryContent({
  isAllMonths,
  onShowAll,
  onBack,
}: HourlyRateHistoryContentProps) {
  const { t, locale } = useTranslation();
  const { state, reload } = useHourlyRateHistory();

  const rows = state.status === 'ready' ? state.rows : [];
  const safetyMarginPct =
    state.status === 'ready' ? state.safetyMarginPct : null;
  const showsAllMonths = isAllMonths && rows.length > 0;

  return (
    <>
      <PricingScreenHeader
        title={t(
          showsAllMonths
            ? 'pricing.history.all.title'
            : 'pricing.history.title',
        )}
        subtitle={
          showsAllMonths
            ? allMonthsHeader(rows, { t, locale })
            : t('pricing.history.subtitle')
        }
        backLabel={t('calculator.back')}
        onBack={onBack}
      />

      <ScrollView contentContainerClassName="gap-[18px] px-[22px] pb-10 pt-2.5">
        {state.status === 'loading' ? (
          <View
            accessibilityLabel={t('pricing.history.loading')}
            className="items-center py-10"
          >
            <ActivityIndicator />
          </View>
        ) : state.status === 'error' ? (
          <Card
            role="alert"
            accessibilityLiveRegion="polite"
            className="items-center gap-3 rounded-[14px] px-6 py-8"
          >
            <Text className="text-center text-[13px] leading-[19.5px] text-label-placeholder">
              {t('pricing.history.loadFailure')}
            </Text>
            <Button
              shape="pill"
              size="sm"
              hitSlop={6}
              onPress={reload}
              className="h-8 gap-1.5 px-3.5"
            >
              <Icon as={RotateCw} size={14} />
              <Text className="text-xs font-semibold">{t('common.retry')}</Text>
            </Button>
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ChartLine}
            title={t('pricing.history.empty.title')}
            message={t('pricing.history.empty.message')}
          />
        ) : showsAllMonths ? (
          <HourlyRateAllMonthsView rows={rows} />
        ) : (
          <HourlyRateHistoryView
            rows={rows}
            safetyMarginPct={safetyMarginPct}
            onShowAll={onShowAll}
          />
        )}
      </ScrollView>
    </>
  );
}
