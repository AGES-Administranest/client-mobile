import { PackageSearch, Plus } from 'lucide-react-native';
import { useState } from 'react';
<<<<<<< HEAD
import { Alert, ScrollView, View } from 'react-native';
=======
import { ScrollView, View } from 'react-native';
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
<<<<<<< HEAD
import { EmptyState } from 'app/components/ui/empty-state';
import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import { ItemModal } from 'app/components/ui/item-modal/item-modal';
import type { ItemDraft } from 'app/components/ui/item-modal/item-modal';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
=======
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { EmptyState } from 'app/components/ui/empty-state';
import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import { ItemModal } from 'app/components/ui/item-modal/item-modal';
import type {
  ItemDraft,
  ItemModalMode,
} from 'app/components/ui/item-modal/item-modal';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { StockEntryFlow } from 'features/stockEntry';
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
import { useTranslation } from 'shared/i18n';
import type { TranslationKey } from 'shared/i18n/dictionary';

import {
  ALL_CATEGORIES,
  CATEGORY_OPTIONS,
  UNIT_OPTIONS,
} from '../domain/materialsFilter';
<<<<<<< HEAD
=======
import { materialsErrorKey } from '../hooks/materialsErrorKeys';
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
import { useMaterialsScreen } from '../hooks/useMaterialsScreen';

export function MaterialsScreen() {
  const { t } = useTranslation();
<<<<<<< HEAD
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [editSourceItem, setEditSourceItem] = useState<StockItem | null>(null);
=======
  const [isSaving, setIsSaving] = useState(false);

  const [modalMode, setModalMode] = useState<ItemModalMode | null>(null);
  const [modalItem, setModalItem] = useState<StockItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StockItem | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a

  const {
    segment,
    onSegmentChange,
    category,
    onCategoryChange,
    categories,
    items,
<<<<<<< HEAD
=======
    stockItems,
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
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

<<<<<<< HEAD
  function closeAddModal() {
    setIsAddItemModalVisible(false);
    setEditSourceItem(null);
=======
  function closeModal() {
    setModalMode(null);
    setModalItem(null);
  }

  function openDetail(item: StockItem | null) {
    if (!item) return;
    setModalItem(item);
    setModalMode('detail');
  }

  function openCreate() {
    setModalItem(null);
    setModalMode('create');
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
  }

  async function handleConfirmAdd(draft: ItemDraft) {
    setIsSaving(true);
<<<<<<< HEAD
    try {
      await onConfirmAdd(draft);
      closeAddModal();
    } catch {
      Alert.alert(t('materials.errorSave'));
=======
    setActionError(null);
    try {
      await onConfirmAdd(draft);
      closeModal();
    } catch (saveError) {
      setActionError(materialsErrorKey(saveError, 'materials.errorSave'));
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item: StockItem) {
<<<<<<< HEAD
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
=======
    setModalItem(item);
    setModalMode('create');
  }

  function handleDelete(item: StockItem) {
    closeModal();
    setPendingDelete(item);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setActionError(null);
    try {
      await onDeleteItem(target.id);
    } catch (deleteError) {
      setActionError(materialsErrorKey(deleteError, 'materials.errorDelete'));
    }
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
  }

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl value={segment} onValueChange={onSegmentChange} />
      <CategoryFilter
<<<<<<< HEAD
=======
        bordered={false}
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
        options={categoryOptions}
        value={category}
        onValueChange={onCategoryChange}
      />
<<<<<<< HEAD
      {error && (
        <View className="rounded-xl bg-destructive/10 px-4 py-3">
          <Text className="text-sm text-destructive">
            {t(error as TranslationKey)}
=======
      {(error || actionError) && (
        <View className="rounded-xl bg-destructive/10 px-4 py-3">
          <Text className="text-sm text-destructive">
            {t((error ?? actionError) as TranslationKey)}
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
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
<<<<<<< HEAD
            onPress={() => setDetailItem(getStockItem(item.id))}
          />
        ))}
      </ScrollView>
=======
            onPress={() => openDetail(getStockItem(item.id))}
          />
        ))}
      </ScrollView>
      <StockEntryFlow />
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
      <Button
        shape="pill"
        icon={Plus}
        className="h-[49px] w-full mb-[16px]"
        disabled={isSaving}
<<<<<<< HEAD
        onPress={() => setIsAddItemModalVisible(true)}
=======
        onPress={openCreate}
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
      >
        <Text>{t('materials.addButton')}</Text>
      </Button>

      <ItemModal
<<<<<<< HEAD
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
=======
        mode={modalMode ?? 'create'}
        visible={modalMode !== null}
        onClose={closeModal}
        item={modalItem}
        items={stockItems}
        categoryOptions={CATEGORY_OPTIONS}
        unitOptions={UNIT_OPTIONS}
        onConfirm={handleConfirmAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={t('materials.deleteConfirmTitle')}
        message={t('materials.deleteConfirmMessage', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('itemModal.delete')}
        cancelLabel={t('itemModal.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
    </View>
  );
}
