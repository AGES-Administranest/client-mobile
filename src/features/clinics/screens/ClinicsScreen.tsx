import { Hospital, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { PartnerCard } from 'app/components/ui/partner-card';
import { Text } from 'app/components/ui/text';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { ClinicDetailSheet } from '../components/ClinicDetailSheet';
import type { ClinicFieldTexts } from '../components/ClinicFields';
import { NewClinicSheet } from '../components/NewClinicSheet';
import type { Client } from '../domain/client';
import {
  CLINIC_FIELDS,
  digitsOnly,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';
import { formatClinicLocation } from '../domain/clinicLocation';
import { useClinicDetail } from '../hooks/useClinicDetail';
import { useNewClinicForm } from '../hooks/useNewClinicForm';

export function ClinicsScreen() {
  const { t } = useTranslation();
  const newClinic = useNewClinicForm();
  const [isNewClinicOpen, setIsNewClinicOpen] = useState(false);
  const [clinics, setClinics] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = clinics.find(clinic => clinic.id === selectedId) ?? null;
  const detail = useClinicDetail(selected);

  const fieldTexts = Object.fromEntries(
    CLINIC_FIELDS.map(field => [
      field,
      {
        label: t(`clinics.newClinic.fields.${field}.label`),
        placeholder: t(`clinics.newClinic.fields.${field}.placeholder`),
      },
    ]),
  ) as Record<ClinicField, ClinicFieldTexts>;

  const toFieldErrors = (errors: ClinicDraftErrors) =>
    Object.fromEntries(
      Object.entries(errors).map(([field, code]) => [
        field,
        t(`clinics.newClinic.errors.${field}.${code}` as TranslationKey),
      ]),
    ) as Partial<Record<ClinicField, string>>;

  const openNewClinic = () => {
    newClinic.reset();
    setIsNewClinicOpen(true);
  };

  const submitNewClinic = async () => {
    const created = await newClinic.submit();

    if (created) {
      setClinics(current => [...current, created]);
      setIsNewClinicOpen(false);
    }
  };

  // ponytail: a lista vive só nesta tela até existir o endpoint de clientes;
  // trocar por updateClient/deleteClient no service quando o backend tiver.
  const saveDetail = () => {
    const updated = detail.submit();

    if (updated) {
      setClinics(current =>
        current.map(clinic => (clinic.id === updated.id ? updated : clinic)),
      );
    }
  };

  const deleteSelected = () => {
    setClinics(current => current.filter(clinic => clinic.id !== selectedId));
    setSelectedId(null);
  };

  const callSelected = () => {
    const phone = digitsOnly(selected?.phone ?? '');
    Linking.openURL(`tel:${phone}`).catch(() => undefined);
  };

  return (
    <View className="flex-1 gap-4">
      {clinics.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon={Hospital} message={t('clinics.empty')} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 pt-3 pb-4"
        >
          <Text className="text-[13px] font-semibold uppercase leading-[19.5px] tracking-[0.52px]">
            {t(
              clinics.length === 1 ? 'clinics.countOne' : 'clinics.countOther',
              { count: clinics.length },
            )}
          </Text>
          {clinics.map(clinic => (
            <PartnerCard
              key={clinic.id}
              name={clinic.name}
              location={formatClinicLocation(clinic)}
              onPress={() => setSelectedId(clinic.id)}
            />
          ))}
        </ScrollView>
      )}

      <Button
        shape="pill"
        className="mb-[16px] h-[49px] w-full"
        onPress={openNewClinic}
      >
        <Icon as={Plus} className="size-5" />
        <Text className="font-semibold">{t('clinics.addClinic')}</Text>
      </Button>

      <NewClinicSheet
        visible={isNewClinicOpen}
        draft={newClinic.draft}
        fieldErrors={toFieldErrors(newClinic.errors)}
        failureMessage={newClinic.failure && t(newClinic.failure)}
        isSaving={newClinic.isSaving}
        title={t('clinics.newClinic.title')}
        fieldTexts={fieldTexts}
        confirmLabel={t('clinics.newClinic.confirm')}
        savingLabel={t('clinics.newClinic.saving')}
        closeLabel={t('clinics.newClinic.close')}
        onChangeField={newClinic.setField}
        onSubmit={submitNewClinic}
        onClose={() => setIsNewClinicOpen(false)}
      />

      <ClinicDetailSheet
        visible={selected !== null}
        title={
          detail.isEditing ? t('clinics.detail.editTitle') : detail.draft.name
        }
        editing={detail.isEditing}
        draft={detail.draft}
        fieldErrors={toFieldErrors(detail.errors)}
        fieldTexts={fieldTexts}
        labels={{
          call: t('clinics.detail.call'),
          edit: t('clinics.detail.edit'),
          confirm: t('clinics.detail.confirm'),
          delete: t('clinics.detail.delete'),
        }}
        closeLabel={t('clinics.newClinic.close')}
        onChangeField={detail.setField}
        onCall={selected?.phone ? callSelected : undefined}
        onEdit={detail.startEditing}
        onConfirm={saveDetail}
        onDelete={deleteSelected}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}
