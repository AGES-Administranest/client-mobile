import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

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
      <View
        className={cn(
          'flex-row items-center justify-between gap-3 rounded-2xl p-4',
          inactive
            ? 'border border-dashed border-border-primary bg-transparent'
            : 'bg-white shadow-md shadow-black/10',
        )}
      >
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className={cn(
                'text-[15px] font-semibold leading-[21px]',
                inactive ? 'text-label-tertiary' : 'text-label-primary',
              )}
              numberOfLines={1}
            >
              {description}
            </Text>
            {inactive ? (
              <View className="rounded-md bg-details-primary px-1.5 py-0.5">
                <Text className="text-[10px] font-bold uppercase text-label-tertiary">
                  {inactiveLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-label-tertiary">{categoryLabel}</Text>
        </View>
        <Text
          className={cn(
            'shrink-0 text-base font-bold',
            inactive ? 'text-label-tertiary' : 'text-label-primary',
          )}
        >
          {formattedValue}
        </Text>
      </View>
    </Pressable>
  );
}

export { FixedCostCard };
