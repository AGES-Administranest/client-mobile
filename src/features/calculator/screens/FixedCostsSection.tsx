import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { FixedCostsCard } from '../components/FixedCostsCard';
import {
  fixedCostsTotal,
  type FixedCostsSummary,
} from '../domain/fixedCostsSummary';
import { useFixedCostsSummary } from '../hooks/useFixedCostsSummary';

type FixedCostsSectionProps = {
  period?: { month: number; year: number };
  // The setup screen of the hourly calculator lists the transport only as
  // its field, since nothing was saved for it yet.
  showTransportLine?: boolean;
  onSaved?: (summary: FixedCostsSummary) => void;
  onOpenList: () => void;
};

export function FixedCostsSection({
  period,
  showTransportLine = true,
  onSaved,
  onOpenList,
}: FixedCostsSectionProps) {
  const { t, locale } = useTranslation();
  const state = useFixedCostsSummary({ period, onSaved });
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
  const automatic = t('calculator.fixedCosts.automatic');
  const lines = [
    {
      label: t('calculator.fixedCosts.personal'),
      value: money(summary.personalExpenses),
      caption: automatic,
    },
    {
      label: t('calculator.fixedCosts.depreciation'),
      value: money(summary.equipmentDepreciation),
      caption: automatic,
    },
  ];
  if (showTransportLine) {
    lines.push({
      label: t('calculator.fixedCosts.transport'),
      value: money(summary.transportCost),
      caption: '',
    });
  }

  return (
    <FixedCostsCard
      title={t('calculator.fixedCosts.title')}
      lines={lines}
      totalLabel={t('calculator.fixedCosts.total')}
      totalValue={money(fixedCostsTotal(summary))}
      transportLabel={t('calculator.fixedCosts.transportField')}
      transportValue={state.transportInput}
      transportPlaceholder={t('calculator.fixedCosts.transportPlaceholder')}
      transportHint={t('calculator.fixedCosts.transportHint')}
      transportError={state.transportError ? t(state.transportError) : null}
      onTransportChange={state.onTransportChange}
      onTransportBlur={state.onTransportBlur}
      isSaving={state.isSaving}
      listLabel={t('calculator.fixedCosts.openList')}
      onListPress={onOpenList}
    />
  );
}
