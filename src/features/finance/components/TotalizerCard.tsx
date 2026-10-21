import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type TotalizerType = 'income' | 'expense';

export type TotalizerCardProps = {
  title: string;
  value: string;
  type: TotalizerType;
};

export function TotalizerCard({ title, value, type }: TotalizerCardProps) {
  return (
    <Card className="min-w-0 flex-1 gap-1 rounded-[14px] p-3">
      <View className="flex-row items-center gap-1">
        <Icon as={type === 'income' ? ArrowUp : ArrowDown} size={12} />
        <Text className="text-[10px] font-semibold uppercase tracking-[0.4px] text-label-primary">
          {title}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className="pt-1 text-sm font-bold text-label-primary"
      >
        {value}
      </Text>
    </Card>
  );
}
