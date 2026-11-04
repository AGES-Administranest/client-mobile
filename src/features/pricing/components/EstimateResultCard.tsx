// LAYOUT PROVISÓRIO: aguardando protótipo do Figma
import {
  AlertCircle,
  Clock,
  Info,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelQuartenery } from 'theme/colors';

import type { ProcedureEstimate } from '../domain/pricing.types';

export type EstimateResultTexts = {
  title: string;
  idleMessage: string;
  loadingMessage: string;
  errorMessage: string;
  retryLabel: string;
  breakdownTitle: string;
  hoursLabel: string;
  tripLabel: string;
  suppliesLabel: string;
  tripNotIncludedWarning: string;
  breakEvenLabel: string;
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
  hasClient: boolean;
  onRetry: () => void;
  texts: EstimateResultTexts;
  className?: string;
};

export function EstimateResultCard({
  status,
  estimate,
  formattedMinimumPrice,
  formattedBreakEvenPrice,
  formattedHoursCost,
  formattedTripCost,
  formattedSuppliesCost,
  formattedHourlyRate,
  formattedDuration,
  hasClient,
  onRetry,
  texts,
  className,
}: EstimateResultCardProps) {
  if (status === 'idle') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-[14px] p-6 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
          className,
        )}
      >
        <View className="size-12 items-center justify-center rounded-full bg-details-warm">
          <Icon as={Clock} size={24} className="text-label-quartenery" />
        </View>
        <Text className="text-center text-sm font-medium text-label-body">
          {texts.idleMessage}
        </Text>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-[14px] p-8 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
          className,
        )}
      >
        <ActivityIndicator color={LabelQuartenery} />
        <Text className="text-center text-sm text-label-body">
          {texts.loadingMessage}
        </Text>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card
        className={cn(
          'items-center gap-3 rounded-[14px] p-6 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
          className,
        )}
      >
        <Icon as={AlertCircle} size={28} className="text-alert-primary" />
        <Text className="text-center text-sm text-alert-primary">
          {texts.errorMessage}
        </Text>
        <Button
          shape="pill"
          variant="outline"
          onPress={onRetry}
          className="mt-2 h-10 px-4"
        >
          <Icon as={RefreshCw} size={14} className="mr-2 text-label-primary" />
          <Text className="text-xs font-semibold text-label-primary">
            {texts.retryLabel}
          </Text>
        </Button>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  const tripEstimateAvailable = estimate.tripEstimateAvailable;

  return (
    <Card
      className={cn(
        'gap-4 rounded-[14px] p-5 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      {/* Cabeçalho do Resultado */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon as={Sparkles} size={18} className="text-label-quartenery" />
          <Text
            accessibilityRole="header"
            className="text-xs font-semibold uppercase tracking-wider text-label-primary"
          >
            {texts.title}
          </Text>
        </View>
      </View>

      {/* Destaque do Valor Mínimo Sugerido */}
      <View className="items-center gap-1 rounded-[12px] bg-details-warm py-4">
        <Text className="text-3xl font-extrabold tracking-tight text-label-primary">
          {formattedMinimumPrice}
        </Text>
        <Text className="text-xs text-label-muted">
          {texts.breakEvenLabel}: {formattedBreakEvenPrice}
        </Text>
      </View>

      {/* Detalhamento das 3 Parcelas */}
      <View className="gap-2.5 pt-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-label-muted">
          {texts.breakdownTitle}
        </Text>

        {/* 1. Parcela de Horas */}
        <View className="flex-row items-center justify-between border-b border-details-primary pb-2.5">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Icon as={Clock} size={14} className="text-label-quartenery" />
              <Text className="text-[13px] font-medium text-label-primary">
                {texts.hoursLabel}
              </Text>
            </View>
            <Text className="text-[11px] text-label-muted">
              {formattedDuration} × {formattedHourlyRate}/h
            </Text>
          </View>
          <Text className="text-sm font-bold text-label-primary">
            {formattedHoursCost}
          </Text>
        </View>

        {/* 2. Parcela de Deslocamento */}
        <View className="flex-row items-center justify-between border-b border-details-primary pb-2.5">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Icon as={Truck} size={14} className="text-label-quartenery" />
              <Text className="text-[13px] font-medium text-label-primary">
                {texts.tripLabel}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-label-primary">
            {formattedTripCost}
          </Text>
        </View>

        {/* Alerta de Deslocamento Não Disponível para Tomador */}
        {hasClient && !tripEstimateAvailable ? (
          <View className="flex-row items-start gap-2 rounded-[8px] bg-details-warm p-2.5">
            <Icon
              as={Info}
              size={15}
              className="mt-0.5 text-label-quartenery"
            />
            <Text className="flex-1 text-[11px] leading-4 text-label-body">
              {texts.tripNotIncludedWarning}
            </Text>
          </View>
        ) : null}

        {/* 3. Parcela de Insumos */}
        <View className="flex-row items-center justify-between pb-1">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Icon
                as={TrendingUp}
                size={14}
                className="text-label-quartenery"
              />
              <Text className="text-[13px] font-medium text-label-primary">
                {texts.suppliesLabel}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-label-primary">
            {formattedSuppliesCost}
          </Text>
        </View>
      </View>
    </Card>
  );
}
