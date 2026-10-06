import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';

export type FixedCostCardProps = {
  description: string;
  categoryLabel: string;
  formattedValue: string;
  inactive: boolean;
  inactiveLabel: string;
  onPress?: () => void;
};

function FixedCostCard({
  description,
  categoryLabel,
  formattedValue,
  inactive,
  inactiveLabel,
  onPress,
}: FixedCostCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View className="gap-2 rounded-2xl bg-white p-4 shadow-md shadow-black/10">
        <View className="flex-row items-start justify-between gap-3">
          <Text
            className="min-w-0 flex-1 text-[15px] font-bold leading-[21px] text-label-primary"
            numberOfLines={1}
          >
            {description}
          </Text>
          <Text className="shrink-0 text-base font-bold text-label-primary">
            {formattedValue}
          </Text>
        </View>
        <Text className="text-xs text-label-tertiary">{categoryLabel}</Text>
        {inactive ? (
          <View className="self-start rounded-full bg-alert-primary px-3.5 py-1">
            <Text className="text-xs font-bold text-label-primary">
              {inactiveLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export { FixedCostCard };
