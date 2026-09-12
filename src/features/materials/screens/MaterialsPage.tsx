import { PackageSearch, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
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
  const [isSaving, setIsSaving] = useState(false);
  // Uma única folha para ver e para editar. Eram duas <Modal>, e alternar
  // entre elas trocava um desaparecimento seco (o Modal some na hora, sem
  // esperar a animação de saída) por outra folha subindo — daí a transição
  // estranha ao clicar em "Editar". Trocando só o modo, a folha nem se mexe.
  const [modalMode, setModalMode] = useState<ItemModalMode | null>(null);
  const [modalItem, setModalItem] = useState<StockItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StockItem | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const {
    segment,
    onSegmentChange,
    category,
    onCategoryChange,
    categories,
    items,
    stockItems,
    suppliers,
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
  }

  async function handleConfirmAdd(draft: ItemDraft) {
    setIsSaving(true);
    setActionError(null);
    try {
      await onConfirmAdd(draft);
      closeModal();
    } catch {
      setActionError('materials.errorSave');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item: StockItem) {
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
    } catch {
      setActionError('materials.errorDelete');
    }
  }

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl value={segment} onValueChange={onSegmentChange} />
      <CategoryFilter
        bordered={false}
        options={categoryOptions}
        value={category}
        onValueChange={onCategoryChange}
      />
      {(error || actionError) && (
        <View className="rounded-xl bg-destructive/10 px-4 py-3">
          <Text className="text-sm text-destructive">
            {t((error ?? actionError) as TranslationKey)}
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
            onPress={() => openDetail(getStockItem(item.id))}
          />
        ))}
      </ScrollView>
      <Button
        shape="pill"
        icon={Plus}
        className="h-[49px] w-full mb-[16px]"
        disabled={isSaving}
        onPress={openCreate}
      >
        <Text>{t('materials.addButton')}</Text>
      </Button>

      <ItemModal
        mode={modalMode ?? 'create'}
        visible={modalMode !== null}
        onClose={closeModal}
        item={modalItem}
        items={stockItems}
        suppliers={suppliers}
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
    </View>
  );
}
