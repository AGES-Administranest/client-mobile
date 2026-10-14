import { PackageSearch, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
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
import {
  clampPercent,
  EquipmentFormSheet,
  EquipmentList,
  formatMonthYear,
  useEquipmentForm,
  useEquipmentList,
  type Equipment,
  type EquipmentFormField,
  type EquipmentFormTarget,
  type EquipmentFormTexts,
} from 'features/equipment';
import { StockEntryFlow } from 'features/stockEntry';
import { useTranslation } from 'shared/i18n';
import type { TranslationKey } from 'shared/i18n/dictionary';
import { formatCurrency } from 'shared/utils/currency';

import {
  ALL_CATEGORIES,
  CATEGORY_OPTIONS,
  UNIT_OPTIONS,
} from '../domain/materialsFilter';
import { materialsErrorKey } from '../hooks/materialsErrorKeys';
import { useMaterialsScreen } from '../hooks/useMaterialsScreen';

function EquipmentSegment() {
  const { t, locale } = useTranslation();
  const { equipments, summary, isLoading, error, refresh } = useEquipmentList();
  const [formRequest, setFormRequest] = useState<
    { kind: 'create' } | { kind: 'view'; id: string }
  >({ kind: 'create' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  // O sheet aponta para o equipamento da lista, não para uma cópia guardada:
  // depois de salvar, a lista nova traz o equipamento atualizado e o detalhe
  // mostra os valores novos. Se ele sumiu da lista, o sheet fecha.
  const selected =
    formRequest.kind === 'view'
      ? equipments.find(equipment => equipment.id === formRequest.id) ?? null
      : null;
  const formTarget = useMemo<EquipmentFormTarget>(
    () =>
      selected ? { mode: 'view', equipment: selected } : { mode: 'create' },
    [selected],
  );
  const isFormVisible =
    isFormOpen && (formRequest.kind === 'create' || selected !== null);

  const handleSaved = useCallback(
    async (savedMode: 'create' | 'edit') => {
      await refresh();
      if (savedMode === 'create') setIsFormOpen(false);
    },
    [refresh],
  );

  // O formulário fecha na parte síncrona, antes do refresh, para o sheet não
  // reabrir quando a confirmação sair.
  const handleDeleted = useCallback(async () => {
    setIsFormOpen(false);
    await refresh();
  }, [refresh]);

  const form = useEquipmentForm({
    target: formTarget,
    visible: isFormVisible,
    onSaved: handleSaved,
    onDeleted: handleDeleted,
  });

  function openForm(request: typeof formRequest) {
    setFormRequest(request);
    setIsFormOpen(true);
  }

  const formFields: EquipmentFormField[] = [
    'name',
    'purchaseValue',
    'acquisitionDate',
    'usefulLifeYears',
    'notes',
  ];

  const formTexts: EquipmentFormTexts = {
    title:
      form.mode === 'view'
        ? form.values.name.trim()
        : t(
            form.mode === 'edit'
              ? 'equipment.form.title.edit'
              : 'equipment.form.title.create',
          ),
    confirm: t(
      form.mode === 'edit'
        ? 'equipment.form.confirm.edit'
        : 'equipment.form.confirm.create',
    ),
    startEdit: t('equipment.form.startEdit'),
    cancel: t('equipment.form.cancel'),
    delete: t('equipment.delete.button'),
    close: t('equipment.form.close'),
    labels: Object.fromEntries(
      formFields.map(field => [field, t(`equipment.form.labels.${field}`)]),
    ) as EquipmentFormTexts['labels'],
    placeholders: Object.fromEntries(
      formFields.map(field => [
        field,
        t(`equipment.form.placeholders.${field}`),
      ]),
    ) as EquipmentFormTexts['placeholders'],
    usefulLifeHint: t('equipment.form.usefulLifeHint'),
  };

  const formErrors = Object.fromEntries(
    Object.entries(form.errors).map(([field, code]) => [
      field,
      t(`equipment.form.errors.${field}.${code}` as TranslationKey),
    ]),
  ) as Partial<Record<EquipmentFormField, string>>;

  const usefulLifeViewText = form.viewUsefulLife
    ? t(
        form.viewUsefulLife.unit === 'months'
          ? 'equipment.form.usefulLifeView.months'
          : form.viewUsefulLife.value === 1
          ? 'equipment.form.usefulLifeView.year'
          : 'equipment.form.usefulLifeView.years',
        { count: form.viewUsefulLife.value },
      )
    : null;

  const submitErrorText = {
    session: t('equipment.errorSession'),
    generic: t('equipment.form.errorSave'),
    delete: t('equipment.delete.error'),
  }[form.submitError ?? 'generic'];

  const items = equipments.map(equipment => ({
    equipment,
    monthlyValue: formatCurrency(equipment.monthlyDepreciation, locale),
    monthlyUnitLabel: t('equipment.card.perMonth'),
    sinceLabel: t('equipment.card.since', {
      date: formatMonthYear(equipment.acquisitionDate, locale),
      value: formatCurrency(equipment.currentValue, locale, {
        showCents: false,
      }),
    }),
    progressPercent: clampPercent(equipment.usefulLifeUsedPct),
    progressLabel: t('equipment.card.lifeUsed', {
      percent: Math.round(clampPercent(equipment.usefulLifeUsedPct)),
    }),
    endOfLifeLabel: equipment.endOfLife
      ? t('equipment.card.endOfLife')
      : undefined,
  }));

  return (
    <>
      <EquipmentList
        items={items}
        summary={
          summary
            ? {
                label: t('equipment.summary.label'),
                value: formatCurrency(summary.monthlyTotal, locale),
                detail: t(
                  summary.count === 1
                    ? 'equipment.summary.countSingular'
                    : 'equipment.summary.countPlural',
                  {
                    count: summary.count,
                    annual: formatCurrency(summary.yearlyTotal, locale, {
                      showCents: false,
                    }),
                  },
                ),
              }
            : null
        }
        isLoading={isLoading}
        errorMessage={error ? t(error) : null}
        loadingLabel={t('equipment.loading')}
        emptyMessage={t('equipment.empty')}
        retryLabel={t('common.retry')}
        addLabel={t('equipment.addButton')}
        onRetry={refresh}
        onAddPress={() => openForm({ kind: 'create' })}
        onEquipmentPress={(equipment: Equipment) =>
          openForm({ kind: 'view', id: equipment.id })
        }
      />
      <EquipmentFormSheet
        visible={form.isSheetVisible}
        mode={form.mode}
        values={form.values}
        errors={formErrors}
        texts={formTexts}
        usefulLifeNotice={
          form.legacyLifeMonths !== null
            ? t('equipment.form.usefulLifeLegacy', {
                months: form.legacyLifeMonths,
              })
            : null
        }
        previewLabel={t('equipment.form.previewLabel')}
        previewValue={
          form.preview
            ? t('equipment.form.previewValue', {
                value: formatCurrency(form.preview.monthlyDepreciation, locale),
              })
            : t('equipment.form.previewUnavailable')
        }
        usefulLifeViewText={usefulLifeViewText}
        previewNote={
          form.preview?.lifeEnded ? t('equipment.form.previewLifeEnded') : null
        }
        submitErrorText={form.submitError ? submitErrorText : null}
        isSubmitting={form.isSubmitting}
        onChangeText={form.onChangeText}
        onBlur={form.onBlur}
        onStartEdit={form.startEdit}
        onCancelEdit={form.cancelEdit}
        onSubmit={form.submit}
        onDelete={form.requestDelete}
        onClosed={form.onSheetClosed}
        onClose={() => setIsFormOpen(false)}
      />
      <ConfirmSheet
        confirmIcon={Trash2}
        visible={form.deleteStep === 'confirming'}
        title={t('equipment.delete.confirmTitle')}
        message={
          form.submitError
            ? submitErrorText
            : t('equipment.delete.confirmMessage', {
                name: selected?.name ?? '',
              })
        }
        confirmLabel={t(
          form.isDeleting
            ? 'equipment.delete.confirming'
            : 'equipment.delete.confirm',
        )}
        cancelLabel={t('equipment.delete.cancel')}
        onConfirm={form.confirmDelete}
        onCancel={form.cancelDelete}
        onClosed={form.onConfirmationClosed}
      />
    </>
  );
}

export function MaterialsScreen() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

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
    isLoading,
    error,
    onConfirmAdd,
    onDeleteItem,
    getStockItem,
  } = useMaterialsScreen();

  const segmentOptions = [
    { value: 'supplies', label: t('segmentedControl.supplies') },
    { value: 'equipment', label: t('segmentedControl.equipment') },
  ] as const;

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
    } catch (saveError) {
      setActionError(materialsErrorKey(saveError, 'materials.errorSave'));
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
    } catch (deleteError) {
      setActionError(materialsErrorKey(deleteError, 'materials.errorDelete'));
    }
  }

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl
        options={segmentOptions}
        value={segment}
        onValueChange={onSegmentChange}
      />
      {segment === 'equipment' ? (
        <EquipmentSegment />
      ) : (
        <>
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
          <StockEntryFlow onTypeItem={openCreate} />
          <Button
            shape="pill"
            icon={Plus}
            className="h-[49px] w-full mb-[16px]"
            disabled={isSaving}
            onPress={openCreate}
          >
            <Text>{t('materials.addButton')}</Text>
          </Button>
        </>
      )}

      <ItemModal
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
        confirmIcon={Trash2}
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
