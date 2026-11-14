import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type InvoiceDeleteListItem = { icon: LucideIcon; label: string };

type InvoiceDeleteListProps = {
  items: InvoiceDeleteListItem[];
};

export function InvoiceDeleteList({ items }: InvoiceDeleteListProps) {
  return (
    <View className="gap-3 rounded-xl bg-details-primary p-4">
      {items.map(item => (
        <View key={item.label} className="flex-row items-center gap-3">
          <Icon as={item.icon} size={18} className="text-label-quartenery" />
          <Text className="flex-1 text-sm text-label-quartenery">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
