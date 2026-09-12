import { Pressable, ScrollView } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type CategoryFilterOption = {
  value: string;
  label: string;
};

type CategoryFilterProps = {
  options: CategoryFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
 
  bordered?: boolean;
};

function CategoryFilter({
  options,
  value,
  onValueChange,
  className,
  bordered = true,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn('grow-0 shrink-0', className)}
      contentContainerClassName="flex-row items-center gap-3"
    >
      {options.map(option => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onValueChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
              'items-center justify-center rounded-full bg-white px-5 py-3',
              bordered &&
                'border border-border-primary shadow-[0px_5px_10px_rgba(0,0,0,0.1)]',
              active && bordered && 'border-button-primary',
              active && 'bg-button-primary',
            )}
          >
            <Text
              className={cn(
                'text-[15px] leading-tight',
                active
                  ? 'font-semibold text-label-secondary'
                  : 'font-medium text-label-tertiary',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export { CategoryFilter };
export type { CategoryFilterOption, CategoryFilterProps };
