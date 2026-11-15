import { ChartLine } from 'lucide-react-native';
import { useLayoutEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { useTranslation } from 'shared/i18n';

import { HourlyRateAllMonthsView } from './HourlyRateAllMonthsView';
import { allMonthsHeader } from './hourlyRateHistoryPresenter';
import { HourlyRateHistoryView } from './HourlyRateHistoryView';
import { HourlyRateMonthDetailView } from './HourlyRateMonthDetailView';
import { HourlyRateLoadFailure } from '../components/HourlyRateLoadFailure';
import { PricingScreenFrame } from '../components/PricingScreenFrame';
import { PricingScreenHeader } from '../components/PricingScreenHeader';
import type { HistoryScreen } from '../domain/hourlyRateHistoryNavigation';
import { useHourlyRateHistory } from '../hooks/useHourlyRateHistory';
import {
  useHourlyRateHistoryNavigation,
  type HourlyRateHistoryNavigation,
} from '../hooks/useHourlyRateHistoryNavigation';

type HourlyRateHistoryScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function HourlyRateHistoryScreen({
  visible,
  onClose,
}: HourlyRateHistoryScreenProps) {
  const navigation = useHourlyRateHistoryNavigation(onClose);
  const { reset } = navigation;

  // Each opening starts on the history, as the first one did.
  useLayoutEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  return (
    <PricingScreenFrame visible={visible} onRequestClose={navigation.back}>
      <HourlyRateHistoryContent navigation={navigation} />
    </PricingScreenFrame>
  );
}

type HourlyRateHistoryContentProps = {
  navigation: HourlyRateHistoryNavigation;
};

// Lives inside the Modal, so each opening fetches once and "Todos os meses"
// reads the same rows instead of asking again.
function HourlyRateHistoryContent({
  navigation,
}: HourlyRateHistoryContentProps) {
  const { t, locale } = useTranslation();
  const { state, reload } = useHourlyRateHistory();
  const { detailMonth, windowIndex, pickedId } = navigation.state;
  const { rememberOffset, takeOffset } = navigation;

  const rows = state.status === 'ready' ? state.rows : [];
  const safetyMarginPct =
    state.status === 'ready' ? state.safetyMarginPct : null;
  const screen: HistoryScreen = detailMonth
    ? 'detail'
    : navigation.state.view === 'all' && rows.length > 0
    ? 'all'
    : 'history';
  const isAllMonthsHeader = screen === 'all';

  // Each screen opens at its top, except when it is reached by coming back:
  // then it is scrolled to where it was left.
  const scrollRef = useRef<ScrollView>(null);
  const pendingOffset = useRef<number | null>(null);
  useLayoutEffect(() => {
    pendingOffset.current = takeOffset(screen);
  }, [screen, takeOffset]);

  return (
    <>
      <PricingScreenHeader
        title={t(
          isAllMonthsHeader
            ? 'pricing.history.all.title'
            : 'pricing.history.title',
        )}
        subtitle={
          isAllMonthsHeader
            ? allMonthsHeader(rows, { t, locale })
            : t('pricing.history.subtitle')
        }
        backLabel={t('calculator.back')}
        onBack={navigation.back}
      />

      <ScrollView
        ref={scrollRef}
        key={screen}
        scrollEventThrottle={16}
        onScroll={event => {
          rememberOffset(screen, event.nativeEvent.contentOffset.y);
        }}
        onContentSizeChange={() => {
          if (pendingOffset.current === null) return;
          scrollRef.current?.scrollTo({
            y: pendingOffset.current,
            animated: false,
          });
          pendingOffset.current = null;
        }}
        contentContainerClassName="gap-[18px] px-[22px] pb-10 pt-2.5"
      >
        {detailMonth ? (
          <HourlyRateMonthDetailView month={detailMonth} />
        ) : state.status === 'loading' ? (
          <View
            accessibilityLabel={t('pricing.history.loading')}
            className="items-center py-10"
          >
            <ActivityIndicator />
          </View>
        ) : state.status === 'error' ? (
          <HourlyRateLoadFailure
            message={t('pricing.history.loadFailure')}
            retryLabel={t('common.retry')}
            onRetry={reload}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ChartLine}
            title={t('pricing.history.empty.title')}
            message={t('pricing.history.empty.message')}
          />
        ) : screen === 'all' ? (
          <HourlyRateAllMonthsView
            rows={rows}
            onOpenMonth={navigation.openMonth}
          />
        ) : (
          <HourlyRateHistoryView
            rows={rows}
            safetyMarginPct={safetyMarginPct}
            windowIndex={windowIndex}
            pickedId={pickedId}
            onChangeWindow={navigation.changeWindow}
            onPickMonth={navigation.pickMonth}
            onOpenMonth={navigation.openMonth}
            onShowAll={navigation.openAll}
          />
        )}
      </ScrollView>
    </>
  );
}
