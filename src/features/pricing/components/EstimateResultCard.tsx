import {
  AlertCircle,
  Calculator,
  Clock,
  RefreshCw,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelQuartenery } from 'theme/colors';

import type { ProcedureEstimate } from '../domain/pricing.types';

export type EstimateResultTexts = {
  title: string;
  laborLabel?: string;
  tripLabel: string;
  suppliesLabel: string;
  totalLabel?: string;
  infoText?: string;
  hoursLabel?: string;
  breakdownTitle?: string;
  tripNotIncludedWarning?: string;
  breakEvenLabel?: string;
  idleMessage: string;
  loadingMessage: string;
  errorMessage: string;
  retryLabel: string;
};

export type EstimateResultCardProps = {
  status: 'idle' | 'loading' | 'success' | 'error';
  estimate: ProcedureEstimate | null;
  formattedMinimumPrice: string;
  formattedBreakEvenPrice: string;
  formattedHoursCost: string;
  formattedTripCost: string;
  formattedSuppliesCost: string;
  formattedHourlyRate: string;
  formattedDuration: string;
  laborCalculation?: string;
  hasClient: boolean;
  onRetry: () => void;
  texts: EstimateResultTexts;
  className?: string;
};

export function EstimateResultCard({
  status,
  estimate,
  formattedMinimumPrice,
  formattedHoursCost,
  formattedTripCost,
  formattedSuppliesCost,
  laborCalculation,
  onRetry,
  texts,
  className,
}: EstimateResultCardProps) {
  if (status === 'idle') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-2xl border border-border-warm/40 bg-white p-6 shadow-sm',
          className,
        )}
      >
        <View className="size-12 items-center justify-center rounded-2xl bg-details-warm">
          <Icon as={Clock} size={22} className="text-label-quartenery" />
        </View>
        <Text className="text-center text-xs font-medium text-label-muted">
          {texts.idleMessage}
        </Text>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-2xl border border-border-warm/40 bg-white p-8 shadow-sm',
          className,
        )}
      >
        <ActivityIndicator color={LabelQuartenery} />
        <Text className="text-center text-xs text-label-muted">
          {texts.loadingMessage}
        </Text>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-2xl border border-border-warm/40 bg-white p-6 shadow-sm',
          className,
        )}
      >
        <Icon as={AlertCircle} size={26} className="text-alert-primary" />
        <Text className="text-center text-xs text-alert-primary">
          {texts.errorMessage}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-1 h-9 flex-row items-center justify-center gap-1.5 rounded-full border border-border-warm px-4 active:opacity-80"
        >
          <Icon as={RefreshCw} size={13} className="text-label-body" />
          <Text className="text-xs font-semibold text-label-body">
            {texts.retryLabel}
          </Text>
        </Pressable>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  const laborTitle = texts.laborLabel || 'Mão de obra';
  const tripTitle = texts.tripLabel || 'Deslocamento';
  const suppliesTitle = texts.suppliesLabel || 'Insumos';
  const totalTitle = texts.totalLabel || 'Total mínimo sugerido';
  const infoText =
    texts.infoText ||
    'O valor é calculado com base no seu custo por hora, deslocamento e insumos previstos';

  return (
    <Card
      className={cn(
        'gap-2 rounded-2xl border border-border-warm/40 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        <Icon as={Calculator} size={18} className="text-label-quartenery" />
        <Text
          accessibilityRole="header"
          className="text-sm font-bold text-label-body"
        >
          {texts.title}
        </Text>
      </View>

      <Text className="my-1 text-3xl font-extrabold tracking-tight text-label-body">
        {formattedMinimumPrice}
      </Text>

      <View className="gap-2.5 pt-1">
        <View className="flex-row items-center justify-between border-t border-border-warm/40 pt-2.5">
          <View>
            <Text className="text-xs font-medium text-label-body">
              {laborTitle}
            </Text>
            {laborCalculation ? (
              <Text className="mt-0.5 text-xs text-label-muted">
                {laborCalculation}
              </Text>
            ) : null}
          </View>
          <Text className="text-xs font-semibold text-label-body">
            {formattedHoursCost}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-border-warm/40 pt-2.5">
          <Text className="text-xs font-medium text-label-body">
            {tripTitle}
          </Text>
          <Text className="text-xs font-semibold text-label-body">
            {formattedTripCost}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-border-warm/40 pt-2.5">
          <Text className="text-xs font-medium text-label-body">
            {suppliesTitle}
          </Text>
          <Text className="text-xs font-semibold text-label-body">
            {formattedSuppliesCost}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-border-warm/40 pt-2.5">
          <Text className="text-xs font-bold text-label-body">{totalTitle}</Text>
          <Text className="text-xs font-bold text-label-body">
            {formattedMinimumPrice}
          </Text>
        </View>
      </View>

      <View className="mt-2 rounded-xl bg-details-warm p-3">
        <Text className="text-xs leading-4 text-label-muted">
          {infoText}
        </Text>
      </View>
    </Card>
  );
}
