import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RefreshCw,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import type { StatementPeriod } from '../domain/statement';
import type { FinanceOverview } from '../hooks/useFinanceOverview';

type FinanceOverviewPanelProps = {
  period: StatementPeriod;
  overview: FinanceOverview | null;
  isLoading: boolean;
  hasError: boolean;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRetry: () => void;
};

function MetricCard({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction: 'up' | 'down';
}) {
  return (
    <Card className="min-w-0 flex-1 gap-1 rounded-[14px] p-3">
      <View className="flex-row items-center gap-1">
        <Icon as={direction === 'up' ? ArrowUp : ArrowDown} size={12} />
        <Text className="text-[10px] font-semibold uppercase tracking-[0.4px] text-label-primary">
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className="pt-1 text-sm font-bold text-label-primary"
      >
        {value}
      </Text>
    </Card>
  );
}

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
  period,
  overview,
  isLoading,
  hasError,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  onRetry,
}: FinanceOverviewPanelProps) {
  const { t, locale } = useTranslation();
  const monthLabel = new Date(
    period.year,
    period.month - 1,
    1,
  ).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const amount = (value: number, cents = false) =>
    formatCurrency(value, locale, { showCents: cents });
  const hours = overview?.hoursWorked ?? 0;

  return (
    <View className="gap-5 px-5 pt-2">
      <Card className="gap-0 rounded-[14px] p-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('finance.previousMonth')}
            onPress={onPreviousMonth}
            className="size-8 items-center justify-center rounded-full bg-button-primary"
          >
            <Icon as={ArrowLeft} size={16} className="text-label-secondary" />
          </Pressable>
          <View className="items-center">
            <Text className="text-sm capitalize text-label-primary">
              {monthLabel}
            </Text>
            {isCurrentMonth ? (
              <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-label-tertiary">
                {t('finance.currentMonth')}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('finance.nextMonth')}
            onPress={onNextMonth}
            className="size-8 items-center justify-center rounded-full bg-button-primary"
          >
            <Icon as={ArrowRight} size={16} className="text-label-secondary" />
          </Pressable>
        </View>
        <Text className="pt-3 text-[11px] font-semibold uppercase tracking-[0.44px] text-label-primary">
          {t('finance.netBalance')}
        </Text>
        <Text className="pt-1 text-4xl font-bold tracking-tight text-label-primary">
          {overview ? amount(overview.netBalance) : isLoading ? '—' : amount(0)}
        </Text>
      </Card>

      <View className="flex-row gap-2.5">
        <MetricCard
          label={t('finance.revenue')}
          value={overview ? amount(overview.revenue, false) : '—'}
          direction="up"
        />
        <MetricCard
          label={t('finance.professional')}
          value={overview ? amount(overview.professionalExpenses, false) : '—'}
          direction="down"
        />
        <MetricCard
          label={t('finance.personal')}
          value={overview ? amount(overview.personalExpenses, false) : '—'}
          direction="down"
        />
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
