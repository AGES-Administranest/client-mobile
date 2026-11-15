import { Phone, Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { PartnerCard } from 'app/components/ui/partner-card';
import { Text } from 'app/components/ui/text';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { NewSupplierSheet } from '../components/NewSupplierSheet';
import { SupplierDetailSheet } from '../components/SupplierDetailSheet';
import type { SupplierFieldTexts } from '../components/SupplierFields';
import {
  SUPPLIER_FIELDS,
  supplierToDraft,
  type SupplierDraftErrors,
  type SupplierField,
  type SupplierPayload,
} from '../domain/supplierForm';
import { useSupplierForm } from '../hooks/useSupplierForm';
import { DUPLICATED_TAX_ID, useSuppliers } from '../hooks/useSuppliers';

export function SuppliersScreen() {
  const { t } = useTranslation();
  const { suppliers, isLoading, failure, create, update, remove } =
    useSuppliers();
  const newForm = useSupplierForm();
  const detailForm = useSupplierForm();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{
    kind: 'activate' | 'deactivate';
    action: 'save' | 'delete';
    payload?: SupplierPayload;
  } | null>(null);

  const fieldTexts = Object.fromEntries(
    SUPPLIER_FIELDS.map(field => [
      field,
      {
        label: t(`suppliers.fields.${field}.label`),
        placeholder: t(`suppliers.fields.${field}.placeholder`),
      },
    ]),
  ) as Record<SupplierField, SupplierFieldTexts>;

  const toFieldErrors = (errors: SupplierDraftErrors) =>
    Object.fromEntries(
      Object.entries(errors).map(([field, code]) => [
        field,
        t(`suppliers.errors.${field}.${code}` as TranslationKey),
      ]),
    ) as Partial<Record<SupplierField, string>>;

  const openNew = () => {
    newForm.reset();
    setIsNewOpen(true);
  };

  const openDetail = (id: string) => {
    const supplier = suppliers.find(item => item.id === id);
    if (!supplier) return;
    detailForm.reset(supplierToDraft(supplier));
    setIsEditing(false);
    setSelectedId(id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setIsEditing(false);
  };

  const submitNew = async () => {
    const payload = newForm.validate();
    if (!payload) return;
    setIsSaving(true);
    const created = await create(payload);
    setIsSaving(false);
    if (created === DUPLICATED_TAX_ID)
      newForm.setFieldError('taxId', 'duplicated');
    else if (created) setIsNewOpen(false);
  };

  const selected = suppliers.find(item => item.id === selectedId);

  const submitDetail = async (payload: SupplierPayload) => {
    if (!selectedId) return;
    setIsSaving(true);
    const updated = await update(selectedId, payload);
    setIsSaving(false);
    if (updated === DUPLICATED_TAX_ID)
      detailForm.setFieldError('taxId', 'duplicated');
    else if (updated) closeDetail();
  };

  // Ativar ou desativar pede confirmação; editar sem mudar o status não.
  const requestSave = () => {
    const payload = detailForm.validate();
    if (!payload) return;
    if (selected && selected.active !== payload.active) {
      setPendingStatus({
        kind: payload.active ? 'activate' : 'deactivate',
        action: 'save',
        payload,
      });
      return;
    }
    submitDetail(payload);
  };

  const requestDelete = () => {
    if (selected?.active) {
      setPendingStatus({ kind: 'deactivate', action: 'delete' });
      return;
    }
    deleteSelected();
  };

  const confirmStatus = () => {
    const pending = pendingStatus;
    setPendingStatus(null);
    if (!pending) return;
    if (pending.action === 'delete') deleteSelected();
    else if (pending.payload) submitDetail(pending.payload);
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    const removed = await remove(selectedId);
    setIsSaving(false);
    if (removed) closeDetail();
  };

  return (
    <View className="flex-1 gap-4">
      {suppliers.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          {isLoading ? null : (
            <EmptyState
              icon={Truck}
              message={t(failure ?? 'suppliers.empty')}
            />
          )}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 pt-3 pb-4"
        >
          <Text className="text-[13px] font-semibold uppercase leading-[19.5px] tracking-[0.52px]">
            {t(
              suppliers.length === 1
                ? 'suppliers.countOne'
                : 'suppliers.countOther',
              { count: suppliers.length },
            )}
          </Text>
          {suppliers.map(supplier => (
            <PartnerCard
              key={supplier.id}
              name={supplier.name}
              location={supplier.phone ?? undefined}
              locationIcon={Phone}
              status={{
                label: t(
                  supplier.active
                    ? 'suppliers.detail.active'
                    : 'suppliers.detail.inactive',
                ),
                active: supplier.active,
              }}
              onPress={() => openDetail(supplier.id)}
            />
          ))}
        </ScrollView>
      )}

      <Button
        shape="pill"
        className="mb-[16px] h-[49px] w-full"
        onPress={openNew}
      >
        <Icon as={Plus} className="size-5" />
        <Text className="font-semibold">{t('suppliers.add')}</Text>
      </Button>

      <NewSupplierSheet
        visible={isNewOpen}
        title={t('suppliers.newTitle')}
        draft={newForm.draft}
        fieldErrors={toFieldErrors(newForm.errors)}
        fieldTexts={fieldTexts}
        confirmLabel={t('suppliers.confirm')}
        closeLabel={t('suppliers.close')}
        isSaving={isSaving}
        onChangeField={newForm.setField}
        onSubmit={submitNew}
        onClose={() => setIsNewOpen(false)}
      />

      <SupplierDetailSheet
        visible={selectedId !== null}
        editing={isEditing}
        draft={detailForm.draft}
        fieldErrors={toFieldErrors(detailForm.errors)}
        fieldTexts={fieldTexts}
        labels={{
          title: t('suppliers.detail.title'),
          editTitle: t('suppliers.detail.editTitle'),
          edit: t('suppliers.detail.edit'),
          confirm: t('suppliers.confirm'),
          delete: t('suppliers.detail.delete'),
          status: t('suppliers.detail.status'),
          active: t('suppliers.detail.active'),
          inactive: t('suppliers.detail.inactive'),
        }}
        closeLabel={t('suppliers.close')}
        isSaving={isSaving}
        onChangeField={detailForm.setField}
        onChangeActive={detailForm.setActive}
        onEdit={() => setIsEditing(true)}
        onConfirm={requestSave}
        onDelete={requestDelete}
        onClose={closeDetail}
      />

      <ConfirmDialog
        visible={pendingStatus !== null}
        tone={pendingStatus?.kind === 'activate' ? 'neutral' : 'danger'}
        title={t(
          `suppliers.statusConfirm.${
            pendingStatus?.kind ?? 'deactivate'
          }.title`,
        )}
        message={t(
          `suppliers.statusConfirm.${
            pendingStatus?.kind ?? 'deactivate'
          }.message`,
        )}
        confirmLabel={t(
          `suppliers.statusConfirm.${
            pendingStatus?.kind ?? 'deactivate'
          }.confirm`,
        )}
        cancelLabel={t('suppliers.statusConfirm.cancel')}
        cancelAppearance="button"
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </View>
  );
}
