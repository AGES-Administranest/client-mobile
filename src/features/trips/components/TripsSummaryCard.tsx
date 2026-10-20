// LAYOUT PROVISÓRIO: aguardando imagem de referência
import { DollarSign, Route } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

export type TripsSummaryCardProps = {
  totalKm: string | number;
  totalCost: string | number;
  tripsCount?: number;
};

export function TripsSummaryCard({
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
  const formattedKm = `${kmNumber.toFixed(1)} km`;

  return (
    <Card className="gap-3 rounded-[14px] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.44px] text-label-primary">
          Resumo do período
        </Text>
        {tripsCount !== undefined ? (
          <Text className="text-xs text-label-tertiary">
            {tripsCount} {tripsCount === 1 ? 'deslocamento' : 'deslocamentos'}
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-xl bg-background-modal p-3">
          <View className="flex-row items-center gap-1.5 pb-1">
            <Icon as={Route} size={14} className="text-label-tertiary" />
            <Text className="text-[10px] font-semibold uppercase text-label-tertiary">
              Total rodado
            </Text>
          </View>
          <Text className="text-lg font-bold text-label-primary">
            {formattedKm}
          </Text>
        </View>

        <View className="flex-1 rounded-xl bg-background-modal p-3">
          <View className="flex-row items-center gap-1.5 pb-1">
            <Icon as={DollarSign} size={14} className="text-label-tertiary" />
            <Text className="text-[10px] font-semibold uppercase text-label-tertiary">
              Custo total
            </Text>
          </View>
          <Text className="text-lg font-bold text-label-primary">
            {formattedCost}
          </Text>
        </View>
      </View>
    </Card>
  );
}
