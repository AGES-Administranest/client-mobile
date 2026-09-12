import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { MaterialCard } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import {
  StockItemSheet,
  type StockItemSheetLabels,
} from '../components/StockItemSheet';
import { MEASUREMENT_UNITS, STOCK_CATEGORIES } from '../domain/stockItem';
import { useStockItems } from '../hooks/useStockItems';

export function StockScreen() {
  const { t } = useTranslation();
  const stock = useStockItems();

  // The only place that touches `t()`: every label the sheet and the cards
  // show is translated here and handed down as plain strings.
  const categories = Object.fromEntries(
    STOCK_CATEGORIES.map(c => [c, t(`stock.itemForm.categories.${c}`)]),
  ) as StockItemSheetLabels['categories'];
  const units = Object.fromEntries(
    MEASUREMENT_UNITS.map(u => [u, t(`stock.itemForm.units.${u}`)]),
  ) as StockItemSheetLabels['units'];

  const sheetLabels: StockItemSheetLabels = {
    title: t('stock.itemForm.title'),
    fields: {
      category: t('stock.itemForm.fields.category'),
      name: t('stock.itemForm.fields.name'),
      unit: t('stock.itemForm.fields.unit'),
      defaultUnitCost: t('stock.itemForm.fields.defaultUnitCost'),
      currentQuantity: t('stock.itemForm.fields.currentQuantity'),
      minimumStock: t('stock.itemForm.fields.minimumStock'),
      expirationDate: t('stock.itemForm.fields.expirationDate'),
    },
    placeholders: {
      name: t('stock.itemForm.placeholders.name'),
      defaultUnitCost: t('stock.itemForm.placeholders.defaultUnitCost'),
      expirationDate: t('stock.itemForm.placeholders.expirationDate'),
    },
    categories,
    units,
    edit: t('stock.itemForm.actions.edit'),
    delete: t('stock.itemForm.actions.delete'),
    errors: {
      required: t('stock.itemForm.errors.required'),
      mustBeNonNegative: t('stock.itemForm.errors.mustBeNonNegative'),
      invalidDate: t('stock.itemForm.errors.invalidDate'),
    },
    confirmDelete: {
      title: t('stock.itemForm.confirmDelete.title'),
      message: t('stock.itemForm.confirmDelete.message', {
        name: stock.selectedItem?.name ?? '',
      }),
      cancel: t('stock.itemForm.confirmDelete.cancel'),
      confirm: t('stock.itemForm.confirmDelete.confirm'),
    },
  };

  return (
    <View className="flex-1 bg-background-modal">
      <ScrollView contentContainerClassName="gap-3 px-4 pb-32 pt-16">
        <Text variant="h3" className="pb-2">
          {t('stock.screen.title')}
        </Text>

        {stock.isLoading ? <ActivityIndicator /> : null}

        {stock.items.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => stock.open(item)}
          >
            <MaterialCard
              name={item.name}
              category={categories[item.category]}
              price={item.defaultUnitCost}
              unit={units[item.unit]}
              quantity={item.currentQuantity}
              minQuantity={item.minimumStock}
            />
          </Pressable>
        ))}
      </ScrollView>

      <StockItemSheet
        item={stock.selectedItem}
        labels={sheetLabels}
        onClose={stock.close}
        onSaved={stock.applySaved}
        onDeleted={stock.applyDeleted}
      />
    </View>
  );
}
