import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type RemovedDataItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

type RemovedDataCardProps = {
  title: string;
  items: readonly RemovedDataItem[];
};

export function RemovedDataCard({ title, items }: RemovedDataCardProps) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-5 shadow-md shadow-black/10">
      <Text className="text-base font-bold text-label-primary">{title}</Text>
      {items.map(item => (
        <View key={item.key} className="flex-row items-center gap-3">
          <Icon as={item.icon} size={20} className="text-label-quartenery" />
          <Text className="text-base text-label-body">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
