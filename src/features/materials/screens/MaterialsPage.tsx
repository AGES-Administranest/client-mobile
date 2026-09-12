import { PackageSearch, Plus } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
import { useTranslation } from 'shared/i18n';

import { ALL_CATEGORIES } from '../domain/materialsFilter';
import { useMaterialsScreen } from '../hooks/useMaterialsScreen';

export function MaterialsScreen() {
  const { t } = useTranslation();
  const {
    segment,
    onSegmentChange,
    category,
    onCategoryChange,
    categories,
    items,
    isLoading,
  } = useMaterialsScreen();

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: t('materials.categoryAll') },
    ...categories.map(item => ({ value: item, label: item })),
  ];

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl value={segment} onValueChange={onSegmentChange} />
      <CategoryFilter
        options={categoryOptions}
        value={category}
        onValueChange={onCategoryChange}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-3"
      >
        {!isLoading && items.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon={PackageSearch}
              message={t('materials.emptyFilter')}
            />
          </View>
        )}
        {items.map(item => (
          <MaterialCard
            key={item.id}
            name={item.name}
            category={item.category}
            price={item.price}
            unit={item.unit}
            quantity={item.quantity}
            minQuantity={item.minQuantity}
            belowMinimum={item.belowMinimum}
          />
        ))}
      </ScrollView>
      <Button shape="pill" icon={Plus} className="h-[49px] w-full mb-[16px]">
        <Text>{t('materials.addButton')}</Text>
      </Button>
    </View>
  );
}
