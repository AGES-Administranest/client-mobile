import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';

type DepreciationSummaryCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function DepreciationSummaryCard({
  label,
  value,
  detail,
}: DepreciationSummaryCardProps) {
  return (
    <Card className="gap-1 rounded-[14px]">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase leading-[18px] text-label-primary">
          {label}
        </Text>
        <Text className="text-[28px] font-bold leading-[36px]">{value}</Text>
        <Text className="text-xs leading-[18px] text-label-primary">
          {detail}
        </Text>
      </View>
    </Card>
  );
}
