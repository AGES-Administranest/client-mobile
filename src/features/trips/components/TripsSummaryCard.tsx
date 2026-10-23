import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

export type TripsSummaryCardProps = {
  monthLabel: string;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  totalKm: string | number;
  totalCost: string | number;
  tripsCount?: number;
};

export function TripsSummaryCard({
  monthLabel,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  totalKm,
  totalCost,
  tripsCount,
}: TripsSummaryCardProps) {
  const { locale } = useTranslation();

  const costNumber =
    typeof totalCost === 'string' ? parseFloat(totalCost) || 0 : totalCost ?? 0;
  const formattedCost = formatCurrency(costNumber, locale, { showCents: true });

  const kmNumber =
    typeof totalKm === 'string' ? parseFloat(totalKm) || 0 : totalKm ?? 0;
  const formattedKm = `${kmNumber.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;

  const countDisplay = tripsCount ?? 0;

  return (
    <View className="rounded-3xl border border-border-primary/40 bg-white p-5 shadow-sm shadow-black/5">
      {/* Seletor de Mês */}
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          hitSlop={8}
          onPress={onPreviousMonth}
          className="size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ChevronLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-semibold text-label-primary">
            {monthLabel}
          </Text>
          {isCurrentMonth ? (
            <Text className="mt-0.5 text-[10px] font-bold tracking-widest text-label-tertiary">
              MÊS ATUAL
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          disabled={isCurrentMonth}
          hitSlop={8}
          onPress={isCurrentMonth ? undefined : onNextMonth}
          className={
            isCurrentMonth
              ? 'size-10 items-center justify-center rounded-full bg-[#DCD8D0] opacity-60'
              : 'size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80'
          }
        >
          <Icon as={ChevronRight} size={20} className="text-label-secondary" />
        </Pressable>
      </View>

      {/* CUSTO NO MÊS */}
      <View className="mt-4">
        <Text className="text-xs font-bold tracking-wider text-label-primary">
          CUSTO NO MÊS
        </Text>
        <Text className="mt-1 text-3xl font-bold text-label-primary">
          {formattedCost}
        </Text>
      </View>

      {/* Métricas: KM RODADOS e DESLOCAMENTOS com tom neutro #F4F1EA */}
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-border-primary/20 bg-[#F4F1EA] p-3.5">
          <Text className="text-[10px] font-bold tracking-wider text-label-primary">
            KM RODADOS
          </Text>
          <Text className="mt-1 text-lg font-bold text-label-primary">
            {formattedKm}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl border border-border-primary/20 bg-[#F4F1EA] p-3.5">
          <Text className="text-[10px] font-bold tracking-wider text-label-primary">
            DESLOCAMENTOS
          </Text>
          <Text className="mt-1 text-lg font-bold text-label-primary">
            {countDisplay}
          </Text>
        </View>
      </View>
    </View>
  );
}
