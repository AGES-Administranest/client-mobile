import { PackageSearch, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
import { EmptyState } from 'app/components/ui/empty-state';
import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import { ItemModal } from 'app/components/ui/item-modal/item-modal';
import type { ItemDraft } from 'app/components/ui/item-modal/item-modal';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import type { TranslationKey } from 'shared/i18n/dictionary';

import {
  ALL_CATEGORIES,
  CATEGORY_OPTIONS,
  UNIT_OPTIONS,
} from '../domain/materialsFilter';
import { useMaterialsScreen } from '../hooks/useMaterialsScreen';

export function MaterialsScreen() {
  const { t } = useTranslation();
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [editSourceItem, setEditSourceItem] = useState<StockItem | null>(null);

  const {
    segment,
    onSegmentChange,
    category,
    onCategoryChange,
    categories,
    items,
    isLoading,
    error,
    onConfirmAdd,
    onDeleteItem,
    getStockItem,
  } = useMaterialsScreen();

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: t('materials.categoryAll') },
    ...categories.map(item => ({ value: item, label: item })),
  ];

  function closeAddModal() {
    setIsAddItemModalVisible(false);
    setEditSourceItem(null);
  }

  async function handleConfirmAdd(draft: ItemDraft) {
    setIsSaving(true);
    try {
      await onConfirmAdd(draft);
      closeAddModal();
    } catch {
      Alert.alert(t('materials.errorSave'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item: StockItem) {
    setDetailItem(null);
    setEditSourceItem(item);
    setIsAddItemModalVisible(true);
  }

  function handleDelete(item: StockItem) {
    Alert.alert(
      t('materials.deleteConfirmTitle'),
      t('materials.deleteConfirmMessage', { name: item.name }),
      [
        { text: t('itemModal.cancel'), style: 'cancel' },
        {
          text: t('itemModal.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteItem(item.id);
              setDetailItem(null);
            } catch {
              Alert.alert(t('materials.errorDelete'));
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl value={segment} onValueChange={onSegmentChange} />
      <CategoryFilter
        options={categoryOptions}
        value={category}
        onValueChange={onCategoryChange}
      />
      {error && (
        <View className="rounded-xl bg-destructive/10 px-4 py-3">
          <Text className="text-sm text-destructive">
            {t(error as TranslationKey)}
          </Text>
        </View>
      )}
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-3"
      >
        {!isLoading && items.length === 0 && !error && (
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
            onPress={() => setDetailItem(getStockItem(item.id))}
          />
        ))}
      </ScrollView>
      <Button
        shape="pill"
        icon={Plus}
        className="h-[49px] w-full mb-[16px]"
        disabled={isSaving}
        onPress={() => setIsAddItemModalVisible(true)}
      >
        <Text>{t('materials.addButton')}</Text>
      </Button>

      <ItemModal
        visible={isAddItemModalVisible}
        onClose={closeAddModal}
        item={editSourceItem}
        categoryOptions={CATEGORY_OPTIONS}
        unitOptions={UNIT_OPTIONS}
        onConfirm={handleConfirmAdd}
      />

      <ItemModal
        mode="detail"
        visible={detailItem !== null}
        onClose={() => setDetailItem(null)}
        item={detailItem}
        categoryOptions={CATEGORY_OPTIONS}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
}
