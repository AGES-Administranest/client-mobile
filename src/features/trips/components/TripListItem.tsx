import {
  Car,
  CarTaxiFront,
  ChevronRight,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import type { Trip } from '../domain/trip.types';

export type TripListItemTexts = {
  subtitle: string;
  cost: string;
  tag?: string;
  pending: string;
  delete: string;
};

export type TripListItemProps = {
  trip: Trip;
  texts: TripListItemTexts;
  onPress?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
};

export function TripListItem({
  trip,
  texts,
  onPress,
  onDelete,
}: TripListItemProps) {
  const content = (
    <View className="flex-row items-center gap-3 px-4 py-[13px]">
      <View className="size-[34px] items-center justify-center rounded-[10px] bg-details-primary">
        <Icon
          as={trip.mode === 'OWN_VEHICLE' ? Car : CarTaxiFront}
          size={16}
          className="text-label-quartenery"
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[13px] font-medium leading-[19.5px] text-label-primary"
        >
          {trip.origin} → {trip.destination}
        </Text>

        <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-[3px] pt-0.5">
          <Text className="text-[11px] leading-[16.5px] text-label-primary">
            {texts.subtitle}
          </Text>
          {texts.tag ? (
            <View className="rounded bg-details-primary px-1.5 py-px">
              <Text
                numberOfLines={1}
                className="text-[10px] font-semibold leading-[15px] text-label-primary"
              >
                {texts.tag}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-1">
        <View className="items-end">
          <Text className="text-sm font-semibold leading-[21px] text-label-primary">
            {texts.cost}
          </Text>
          {trip.pendingSync ? (
            <View className="flex-row items-center gap-[3px]">
              <Icon as={Clock} size={10} className="text-label-tertiary" />
              <Text className="text-[10px] text-label-tertiary">
                {texts.pending}
              </Text>
            </View>
          ) : null}
        </View>

        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.delete}
            hitSlop={8}
            onPress={() => onDelete(trip)}
            className="p-1 active:opacity-60"
          >
            <Icon as={Trash2} size={16} className="text-alert-primary" />
          </Pressable>
        ) : onPress ? (
          <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(trip)}
        className="active:bg-details-primary"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
