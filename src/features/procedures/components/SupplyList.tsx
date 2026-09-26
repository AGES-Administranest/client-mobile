import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type SupplyListRow = {
  id: string;
  name: string;
  /** Preformatted quantity × unit cost, e.g. "1 un. × R$ 19,90". */
  detail: string;
  /** Preformatted line cost, e.g. "R$ 19,90". */
  cost: string;
  removeLabel: string;
};

type SupplyListProps = {
  rows: readonly SupplyListRow[];
  emptyMessage: string;
  onRemove: (id: string) => void;
  className?: string;
};

function SupplyList({
  rows,
  emptyMessage,
  onRemove,
  className,
}: SupplyListProps) {
  if (rows.length === 0) {
    return (
      <View
        className={cn(
          'rounded-2xl border border-dashed border-border-primary px-4 py-4',
          className,
        )}
      >
        <Text className="text-sm text-label-tertiary">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'overflow-hidden rounded-2xl bg-background-modal',
        className,
      )}
    >
      {rows.map((row, index) => (
        <View
          key={row.id}
          className={cn(
            'flex-row items-center gap-3 px-4 py-4',
            index < rows.length - 1 && 'border-b border-border-primary',
          )}
        >
          <View className="flex-1 gap-1">
            <Text className="text-base font-medium text-label-primary">
              {row.name}
            </Text>
            <Text className="text-xs text-label-primary">{row.detail}</Text>
          </View>

          <Text className="text-base font-bold text-label-primary">
            {row.cost}
          </Text>

          <Pressable
            role="button"
            accessibilityLabel={row.removeLabel}
            hitSlop={12}
            onPress={() => onRemove(row.id)}
            className="p-1"
          >
            <Icon as={X} size={16} className="text-label-primary" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export { SupplyList };
export type { SupplyListProps, SupplyListRow };
