import { CarFront, Clock, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import type { Trip } from '../domain/trip.types';

export type TripListItemProps = {
  trip: Trip;
  vehicleName?: string;
  clientName?: string;
  onPress?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  showDelete?: boolean;
};

export function TripListItem({
  trip,
  vehicleName,
  clientName,
  onPress,
  onDelete,
  showDelete = true,
}: TripListItemProps) {
  const { locale } = useTranslation();

  const costNumber =
    typeof trip.cost === 'string' ? parseFloat(trip.cost) || 0 : trip.cost ?? 0;
  const formattedCost = formatCurrency(costNumber, locale, { showCents: true });

  const distanceText =
    trip.distanceKm != null ? `${trip.distanceKm} km` : null;

  const modeLabel =
    trip.mode === 'OWN_VEHICLE'
      ? vehicleName || 'Veículo próprio'
      : 'Aplicativo / Táxi';

  return (
    <Pressable
      onPress={() => onPress?.(trip)}
      accessibilityRole="button"
      className="flex-row items-center justify-between rounded-xl border border-border-primary bg-white p-3.5"
    >
      <View className="flex-1 gap-1 pr-3">
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className="text-sm font-bold text-label-primary"
          >
            {trip.origin} → {trip.destination}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1">
            <Icon as={CarFront} size={13} className="text-label-tertiary" />
            <Text className="text-xs text-label-tertiary">{modeLabel}</Text>
          </View>

          {distanceText ? (
            <Text className="text-xs text-label-tertiary">· {distanceText}</Text>
          ) : null}

          {clientName ? (
            <Text
              numberOfLines={1}
              className="text-xs text-label-tertiary"
            >
              · {clientName}
            </Text>
          ) : null}
        </View>

        {trip.pendingSync ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Icon as={Clock} size={11} className="text-label-tertiary" />
            <Text className="text-[11px] text-label-tertiary">
              Pendente de sincronização
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-3">
        <Text className="text-sm font-bold text-label-primary">
          {formattedCost}
        </Text>

        {showDelete && onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Excluir deslocamento"
            hitSlop={8}
            onPress={() => onDelete(trip)}
            className="p-1 active:opacity-60"
          >
            <Icon as={Trash2} size={16} className="text-alert-primary" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
