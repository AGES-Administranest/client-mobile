import { Pressable, ScrollView } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

import { ALL_CATEGORIES } from '../domain/materialsFilter';

type CategoryFilterProps = {
  categories: string[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

function CategoryFilter({
  categories,
  value,
  onValueChange,
  className,
}: CategoryFilterProps) {
  const { t } = useTranslation();
  const options = [ALL_CATEGORIES, ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      contentContainerClassName="flex-row gap-2"
    >
      {options.map(option => {
        const active = option === value;
        const label =
          option === ALL_CATEGORIES ? t('materials.categoryAll') : option;

        return (
          <Pressable
            key={option}
            onPress={() => onValueChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
              'rounded-full border border-border-primary bg-white px-4 py-2',
              active && 'border-button-primary bg-button-primary',
            )}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                active ? 'text-label-secondary' : 'text-label-tertiary',
              )}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export { CategoryFilter };
export type { CategoryFilterProps };
