import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { STOCK_CATEGORIES, type StockCategory } from '../domain/stockItem';

type CategorySelectorProps = {
  value: StockCategory | null;
  /** Already-translated label per category — the screen owns `t()`. */
  labels: Record<StockCategory, string>;
  onSelect: (category: StockCategory) => void;
};

// Presentational pill chips (Figma "Categoria" row). Knows nothing about
// i18n or validation: it renders what it is given and reports a tap.
export function CategorySelector({
  value,
  labels,
  onSelect,
}: CategorySelectorProps) {
  return (
    <View className="flex-row gap-2">
      {STOCK_CATEGORIES.map(category => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={cn(
              'rounded-full border px-4 py-2',
              selected
                ? 'border-primary bg-primary'
                : 'border-border-primary bg-white',
            )}
          >
            <Text
              className={cn(
                'text-sm',
                selected ? 'text-label-secondary' : 'text-label-primary',
              )}
            >
              {labels[category]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
