import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { monthOf } from 'shared/utils/monthPeriod';

import { HourlyRateHistoryScreen } from './HourlyRateHistoryScreen';
import { HourlyRateResultView } from './HourlyRateResultView';
import { PricingSetupView } from './PricingSetupView';
import { ProcedureEstimateScreen } from './ProcedureEstimateScreen';
import { PricingOnboarding } from '../components/PricingOnboarding';
import { PricingScreenFrame } from '../components/PricingScreenFrame';
import { PricingScreenHeader } from '../components/PricingScreenHeader';
import { useHourlyRate } from '../hooks/useHourlyRate';

type HourlyRateScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function HourlyRateScreen({ visible, onClose }: HourlyRateScreenProps) {
  return (
    <PricingScreenFrame visible={visible} onRequestClose={onClose}>
      <HourlyRateContent onClose={onClose} />
    </PricingScreenFrame>
  );
}

// Lives inside the Modal, so each opening starts on the current month and
// only fetches while the calculator is on screen.
function HourlyRateContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isEstimateVisible, setIsEstimateVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const { state, reload } = useHourlyRate(month);

  const goBack = isConfiguring ? () => setIsConfiguring(false) : onClose;

  return (
    <>
      <PricingScreenHeader
        title={t(isConfiguring ? 'pricing.setup.title' : 'calculator.title')}
        subtitle={t(
          isConfiguring ? 'pricing.setup.subtitle' : 'calculator.subtitle',
        )}
        backLabel={t('calculator.back')}
        onBack={goBack}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-[18px] px-[22px] pb-10 pt-2.5"
      >
        {isConfiguring ? (
          <PricingSetupView
            month={month}
            onSaved={() => {
              reload();
              setIsConfiguring(false);
            }}
          />
        ) : state.status === 'loading' ? (
          <View
            accessibilityLabel={t('pricing.hourlyRate.loading')}
            className="items-center py-10"
          >
            <ActivityIndicator />
          </View>
        ) : state.status === 'error' ? (
          <View className="items-center gap-2 py-10">
            <Text className="text-center text-sm text-alert-primary">
              {t('pricing.hourlyRate.loadFailure')}
            </Text>
            <Pressable accessibilityRole="button" onPress={reload}>
              <Text className="text-[13px] font-semibold text-label-quartenery">
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : state.status === 'unconfigured' ? (
          <PricingOnboarding
            title={t('pricing.onboarding.title')}
            message={t('pricing.onboarding.message')}
            goals={{
              monthlyIncomeGoal: {
                title: t('pricing.onboarding.goals.monthlyIncomeGoal.title'),
                caption: t(
                  'pricing.onboarding.goals.monthlyIncomeGoal.caption',
                ),
              },
              weeklyHours: {
                title: t('pricing.onboarding.goals.weeklyHours.title'),
                caption: t('pricing.onboarding.goals.weeklyHours.caption'),
              },
              safetyMarginPct: {
                title: t('pricing.onboarding.goals.safetyMarginPct.title'),
                caption: t('pricing.onboarding.goals.safetyMarginPct.caption'),
              },
            }}
            actionLabel={t('pricing.onboarding.action')}
            onConfigure={() => setIsConfiguring(true)}
            footnote={t('pricing.onboarding.footnote')}
          />
        ) : (
          <HourlyRateResultView
            month={month}
            onMonthChange={setMonth}
            hourlyRate={state.hourlyRate}
            isRefreshing={state.isRefreshing}
            onChanged={reload}
            onOpenProcedureEstimate={() => setIsEstimateVisible(true)}
            onOpenHistory={() => setIsHistoryVisible(true)}
          />
        )}
      </ScrollView>

      {/* Ponto de entrada US21: Tela de simulação de valor mínimo por procedimento */}
      <ProcedureEstimateScreen
        visible={isEstimateVisible}
        onClose={() => setIsEstimateVisible(false)}
      />

      <HourlyRateHistoryScreen
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
      />
    </>
  );
}
