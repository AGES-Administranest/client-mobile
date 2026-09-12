import { Plus } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { CategoryFilter } from '../components/CategoryFilter';
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

  return (
    <View className="flex-1 gap-4 bg-background-modal px-4 pt-4">
      <SegmentedControl value={segment} onValueChange={onSegmentChange} />
      <CategoryFilter
        categories={categories}
        value={category}
        onValueChange={onCategoryChange}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-3">
        {!isLoading && items.length === 0 && (
          <Text variant="muted" className="mt-8 text-center">
            {t('materials.emptyFilter')}
          </Text>
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
      <Button shape="pill" icon={Plus} className="h-[49px] w-full">
        <Text>{t('materials.addButton')}</Text>
      </Button>
    </View>
  );
}
