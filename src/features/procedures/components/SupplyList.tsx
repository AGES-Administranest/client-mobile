import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

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
  /** Sem ele a lista é só leitura: um atendimento cancelado não aceita mudar insumos. */
  onRemove?: (id: string) => void;
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
      <View className={cn('rounded-2xl bg-white px-3.5 py-3', className)}>
        <Text className="text-sm text-label-tertiary">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    // Figma: card branco com a sombra suave dos outros cards e divisórias
    // claras entre as linhas.
    <View className={cn('rounded-2xl bg-white', className)} style={styles.card}>
      {rows.map((row, index) => (
        <View
          key={row.id}
          className={cn(
            'flex-row items-center gap-3 px-4 py-3.5',
            index < rows.length - 1 && 'border-b border-details-primary',
          )}
        >
          <View className="flex-1 gap-1">
            <Text className="text-[15px] text-label-primary">{row.name}</Text>
            <Text className="text-[11px] text-label-primary">{row.detail}</Text>
          </View>

          <Text className="text-base font-bold text-label-primary">
            {row.cost}
          </Text>

          {onRemove ? (
            <Pressable
              role="button"
              accessibilityLabel={row.removeLabel}
              hitSlop={12}
              onPress={() => onRemove(row.id)}
              className="p-1"
            >
              <Icon as={X} size={16} className="text-label-primary" />
            </Pressable>
          ) : null}
        </View>
      ))}
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

export { SupplyList };
export type { SupplyListProps, SupplyListRow };
