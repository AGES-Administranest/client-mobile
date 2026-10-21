import { RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { PeriodBalanceCard } from './PeriodBalanceCard';
import { TotalizerCard, type TotalizerCardProps } from './TotalizerCard';
import type { FinanceOverview } from '../hooks/useFinanceOverview';

type FinanceOverviewPanelProps = {
  monthLabel: string;
  currentMonthLabel: string | null;
  netBalanceLabel: string;
  netBalance: string;
  isNegativeBalance: boolean;
  previousMonthLabel: string;
  nextMonthLabel: string;
  totalizers: readonly TotalizerCardProps[];
  overview: FinanceOverview | null;
  hasError: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRetry: () => void;
};

function ProductivityCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="min-w-0 flex-1 gap-1 rounded-[14px] p-4">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.4px] text-label-primary">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className="pt-1 text-[22px] font-bold leading-8 text-label-primary"
      >
        {value}
      </Text>
      <Text className="text-[11px] text-label-primary">{detail}</Text>
    </Card>
  );
}

export function FinanceOverviewPanel({
  monthLabel,
  currentMonthLabel,
  netBalanceLabel,
  netBalance,
  isNegativeBalance,
  previousMonthLabel,
  nextMonthLabel,
  totalizers,
  overview,
  hasError,
  onPreviousMonth,
  onNextMonth,
  onRetry,
}: FinanceOverviewPanelProps) {
  const { t, locale } = useTranslation();
  const amount = (value: number, cents = false) =>
    formatCurrency(value, locale, { showCents: cents });
  const hours = overview?.hoursWorked ?? 0;

  return (
    <View className="gap-5 px-5 pt-2">
      <PeriodBalanceCard
        monthLabel={monthLabel}
        currentMonthLabel={currentMonthLabel}
        netBalanceLabel={netBalanceLabel}
        netBalance={netBalance}
        isNegative={isNegativeBalance}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
      />

      <View className="flex-row gap-2.5">
        {totalizers.map(item => (
          <TotalizerCard key={item.title} {...item} />
        ))}
      </View>

      <View>
        <Text className="text-[13px] font-semibold uppercase tracking-[0.52px] text-label-primary">
          {t('finance.productivityAndFixedCosts')}
        </Text>
        <View className="mt-3 flex-row gap-2">
          <ProductivityCard
            label={t('finance.hoursWorked')}
            value={t('finance.hoursValue', { hours: Math.round(hours) })}
            detail={t('finance.thisMonth')}
          />
          <ProductivityCard
            label={t('finance.averageHourly')}
            value={
              overview?.averageHourly == null
                ? '—'
                : amount(overview.averageHourly, false)
            }
            detail={t('finance.grossPerHour')}
          />
        </View>
        <Card className="mt-2 flex-row items-center justify-between rounded-[14px] px-4 py-3.5">
          <View className="flex-1 pr-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.44px] text-label-primary">
              {t('finance.equipmentDepreciation')}
            </Text>
            <Text className="pt-1 text-[13px] text-label-primary">
              {t('finance.equipmentMonthlyCost', {
                count: overview?.equipmentCount ?? 0,
              })}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-lg font-bold text-label-primary">
              {overview ? `– ${amount(overview.depreciation, true)}` : '—'}
            </Text>
            <Text className="text-[11px] text-label-primary">
              {t('finance.perMonth')}
            </Text>
          </View>
        </Card>
      </View>

      {hasError ? (
        <View className="flex-row items-center justify-between rounded-xl border border-alert-primary bg-background-modal p-3">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-label-primary">
              {t('finance.overviewError')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="flex-row items-center gap-1 rounded-full bg-button-primary px-3 py-2"
          >
            <Icon as={RefreshCw} size={14} className="text-label-secondary" />
            <Text className="text-xs font-semibold text-label-secondary">
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
