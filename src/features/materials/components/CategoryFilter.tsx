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
      className={cn('grow-0 shrink-0', className)}
      contentContainerClassName="flex-row items-center gap-3"
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
              'items-center justify-center rounded-full border border-border-primary bg-white px-5 py-3',
              active && 'border-button-primary bg-button-primary',
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
