import {
  Car,
  CarFront,
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
    <View className="flex-row items-center justify-between p-3.5">
      <View className="mr-3 size-11 items-center justify-center rounded-2xl bg-details-primary">
        <Icon
          as={trip.mode === 'OWN_VEHICLE' ? Car : CarFront}
          size={20}
          className="text-label-quartenery"
        />
      </View>

      <View className="flex-1 pr-2">
        <Text
          numberOfLines={1}
          className="text-[14px] font-bold text-label-primary"
        >
          {trip.origin} → {trip.destination}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 text-xs text-label-tertiary">
          {texts.subtitle}
        </Text>

        {texts.tag ? (
          <View className="mt-1 self-start rounded-md bg-details-primary px-2 py-0.5">
            <Text
              numberOfLines={1}
              className="text-[11px] font-semibold text-label-primary"
            >
              {texts.tag}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="items-end justify-center">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-bold text-label-primary">
            {texts.cost}
          </Text>

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

        {trip.pendingSync ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Icon as={Clock} size={11} className="text-label-tertiary" />
            <Text className="text-[10px] text-label-tertiary">
              {texts.pending}
            </Text>
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
        className="active:bg-details-primary"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
