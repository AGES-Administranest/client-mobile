import { StyleSheet, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  price: string;
  quantity: number;
};

type InventoryItemCardProps = {
  item: InventoryItem;
  minLabel?: string;
  warning?: string;
};

export function InventoryItemCard({
  item,
  minLabel,
  warning,
}: InventoryItemCardProps) {
  return (
    <View
      style={styles.card}
      className={cn(
        'w-full flex-row items-start gap-3 rounded-[14px] bg-white p-4',
        warning && 'border-2 border-alert-primary',
      )}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-label-primary">
          {item.name}
        </Text>
        <Text className="pt-0.5 text-xs text-label-tertiary">
          {item.category} · {item.price}
        </Text>
        {warning ? (
          <Text className="pt-0.5 text-xs text-button-secondary">
            {warning}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <Text className="text-lg font-bold text-label-primary">
          {item.quantity}
        </Text>
        {minLabel ? (
          <Text className="text-[11px] text-label-tertiary">{minLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});
