import { MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type ProcedureHistoryCardProps = {
  patientName: string;
  speciesLabel?: string;
  asaLabel?: string;
  procedureName: string;
  clientName: string;
  date: string;
  amount: string;
  onPress?: () => void;
  className?: string;
};

export function ProcedureHistoryCard({
  patientName,
  speciesLabel,
  asaLabel,
  procedureName,
  clientName,
  date,
  amount,
  onPress,
  className,
}: ProcedureHistoryCardProps) {
  const content = (
    <Card variant="material" className={cn('items-start', className)}>
      <View className="min-w-0 flex-1 gap-1 pr-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-lg font-bold leading-6" numberOfLines={1}>
            {patientName}
          </Text>
          {speciesLabel ? <Text variant="muted">{speciesLabel}</Text> : null}
          {asaLabel ? (
            <View className="rounded-full bg-details-primary px-2 py-0.5">
              <Text className="text-xs font-medium text-label-primary">
                {asaLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1}>{procedureName}</Text>
        <View className="flex-row items-center gap-1">
          <Icon as={MapPin} className="size-3.5 text-label-tertiary" />
          <Text variant="muted" className="shrink" numberOfLines={1}>
            {clientName}
          </Text>
          <Text variant="muted" className="shrink-0">
            {date}
          </Text>
        </View>
      </View>
      <Text className="text-base font-bold leading-6">{amount}</Text>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
