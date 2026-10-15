import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ScopeFilterOption<T extends string> = { value: T; label: string };

type ScopeFilterProps<T extends string> = {
  options: readonly ScopeFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  className?: string;
};

export function ScopeFilter<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: ScopeFilterProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row flex-wrap gap-1.5', className)}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
            className={cn(
              'h-[31px] items-center justify-center rounded-[20px] px-3',
              selected
                ? 'bg-button-primary'
                : 'bg-white shadow-[0px_5px_5px_rgba(0,0,0,0.1)]',
            )}
          >
            <Text
              className={cn(
                'text-xs font-medium leading-[18px]',
                selected ? 'text-label-secondary' : 'text-label-primary',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type { ScopeFilterOption, ScopeFilterProps };
