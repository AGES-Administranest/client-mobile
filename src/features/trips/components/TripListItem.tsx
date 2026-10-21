import { Car, CarFront, ChevronRight, Clock, Trash2 } from 'lucide-react-native';
import React from 'react';
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
  appointmentTitle?: string;
  onPress?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  showDelete?: boolean;
  showChevron?: boolean;
};

export function TripListItem({
  trip,
  vehicleName,
  clientName,
  appointmentTitle,
  onPress,
  onDelete,
  showDelete = false,
  showChevron = true,
}: TripListItemProps) {
  const { locale } = useTranslation();

  const costNumber =
    typeof trip.cost === 'string' ? parseFloat(trip.cost) || 0 : trip.cost ?? 0;
  const formattedCost = formatCurrency(costNumber, locale, { showCents: true });

  const distanceText =
    trip.distanceKm != null ? `${trip.distanceKm} km` : null;

  const modeSubtitle =
    trip.mode === 'OWN_VEHICLE'
      ? `${vehicleName || 'Veículo próprio'}${distanceText ? ` · ${distanceText}` : ''}`
      : `Aplicativo${distanceText ? ` · ${distanceText}` : ''}`;

  const tagText = appointmentTitle || clientName;

  const content = (
    <View className="flex-row items-center justify-between p-3.5">
      {/* Ícone à esquerda */}
      <View className="size-11 items-center justify-center rounded-2xl bg-details-primary mr-3">
        <Icon
          as={trip.mode === 'OWN_VEHICLE' ? Car : CarFront}
          size={20}
          className="text-label-quartenery"
        />
      </View>

      {/* Conteúdo central */}
      <View className="flex-1 pr-2">
        <Text
          numberOfLines={1}
          className="text-[14px] font-bold text-label-primary"
        >
          {trip.origin} → {trip.destination}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 text-xs text-label-tertiary">
          {modeSubtitle}
        </Text>

        {tagText ? (
          <View className="mt-1 self-start rounded-md bg-details-primary px-2 py-0.5">
            <Text
              numberOfLines={1}
              className="text-[11px] font-semibold text-label-primary"
            >
              {tagText}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Direita: Custo, Chevron / Delete e Status Offline */}
      <View className="items-end justify-center">
        <View className="flex-row items-center gap-1.5">
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
          ) : showChevron && onPress ? (
            <Icon as={ChevronRight} size={16} className="text-[#A09A90]" />
          ) : null}
        </View>

        {trip.pendingSync ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Icon as={Clock} size={11} className="text-[#A09A90]" />
            <Text className="text-[10px] text-label-tertiary">pendente</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(trip)}
        className="active:bg-[#F9F7F3]"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
