import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ChipSelectorProps<T extends string> = {
  options: readonly T[];
  value: T | null;
  /** Already-translated label per option — the screen owns `t()`. */
  labels: Record<T, string>;
  onSelect: (option: T) => void;
};

// Presentational pill chips (Figma "Categoria" row; also used for the unit).
// Knows nothing about i18n or validation: it renders what it is given and
// reports a tap. Generic over the option type so category and unit share it.
export function ChipSelector<T extends string>({
  options,
  value,
  labels,
  onSelect,
}: ChipSelectorProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map(option => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
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
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
