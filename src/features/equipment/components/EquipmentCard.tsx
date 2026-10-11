import { TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type EquipmentCardProps = {
  name: string;
  monthlyValue: string;
  monthlyUnitLabel: string;
  sinceLabel: string;
  progressPercent: number;
  progressLabel: string;
  endOfLifeLabel?: string;
  onPress: () => void;
};

export function EquipmentCard({
  name,
  monthlyValue,
  monthlyUnitLabel,
  sinceLabel,
  progressPercent,
  progressLabel,
  endOfLifeLabel,
  onPress,
}: EquipmentCardProps) {
  const isEndOfLife = endOfLifeLabel !== undefined;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="gap-1 rounded-[14px]">
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-semibold leading-[21px]">{name}</Text>
            <Text variant="muted" className="text-xs leading-[18px]">
              {sinceLabel}
            </Text>
          </View>
          <View className="shrink-0 items-end">
            <Text className="text-sm font-semibold leading-[21px]">
              {monthlyValue}
            </Text>
            <Text variant="muted" className="text-[11px] leading-[17px]">
              {monthlyUnitLabel}
            </Text>
          </View>
        </View>
        <View className="mt-1 h-[4px] overflow-hidden rounded-full bg-border-primary">
          <View
            className={cn(
              'h-full rounded-full',
              isEndOfLife ? 'bg-details-tertiary' : 'bg-label-primary',
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="muted" className="text-[11px] leading-[17px]">
            {progressLabel}
          </Text>
          {isEndOfLife ? (
            <View className="flex-row items-center gap-[3px] rounded-full bg-details-tertiary px-2 py-0.5">
              <Icon
                as={TriangleAlert}
                size={10}
                className="text-label-primary"
              />
              <Text className="text-[11px] font-semibold leading-[17px] text-label-primary">
                {endOfLifeLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
