import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { FixedCostsCard } from '../components/FixedCostsCard';
import { fixedCostsTotal } from '../domain/fixedCostsSummary';
import { useFixedCostsSummary } from '../hooks/useFixedCostsSummary';

type FixedCostsSectionProps = {
  period?: { month: number; year: number };
};

export function FixedCostsSection({ period }: FixedCostsSectionProps) {
  const { t, locale } = useTranslation();
  const state = useFixedCostsSummary({ period });
  const { summary } = state;

  if (state.isLoading && !summary) {
    return (
      <View
        accessibilityLabel={t('calculator.fixedCosts.loading')}
        className="items-center py-6"
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!summary) {
    return (
      <View className="items-center gap-2 py-6">
        <Text className="text-center text-sm text-alert-primary">
          {state.loadError ? t(state.loadError) : null}
        </Text>
        <Pressable accessibilityRole="button" onPress={state.retry}>
          <Text className="text-[13px] font-semibold text-label-quartenery">
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const money = (value: number) => formatCurrency(value, locale);

  return (
    <FixedCostsCard
      title={t('calculator.fixedCosts.title')}
      lines={[
        {
          label: t('calculator.fixedCosts.personal'),
          value: money(summary.personalExpenses),
        },
        {
          label: t('calculator.fixedCosts.depreciation'),
          value: money(summary.equipmentDepreciation),
        },
        {
          label: t('calculator.fixedCosts.transport'),
          value: money(summary.transportCost),
        },
      ]}
      totalLabel={t('calculator.fixedCosts.total')}
      totalValue={money(fixedCostsTotal(summary))}
    />
  );
}
