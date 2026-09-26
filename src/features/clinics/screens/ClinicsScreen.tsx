import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import {
  NewClinicSheet,
  type NewClinicSheetProps,
} from '../components/NewClinicSheet';
import { CLINIC_FIELDS, type ClinicField } from '../domain/clinicForm';
import { useNewClinicForm } from '../hooks/useNewClinicForm';

export function ClinicsScreen() {
  const { t } = useTranslation();
  const newClinic = useNewClinicForm();
  const [isNewClinicOpen, setIsNewClinicOpen] = useState(false);

  const fieldTexts = Object.fromEntries(
    CLINIC_FIELDS.map(field => [
      field,
      {
        label: t(`clinics.newClinic.fields.${field}.label`),
        placeholder: t(`clinics.newClinic.fields.${field}.placeholder`),
      },
    ]),
  ) as NewClinicSheetProps['fieldTexts'];

  const { errors } = newClinic;
  const fieldErrors: Partial<Record<ClinicField, string>> = {
    name: errors.name && t(`clinics.newClinic.errors.name.${errors.name}`),
    cnpj: errors.cnpj && t(`clinics.newClinic.errors.cnpj.${errors.cnpj}`),
    state: errors.state && t(`clinics.newClinic.errors.state.${errors.state}`),
    phone: errors.phone && t(`clinics.newClinic.errors.phone.${errors.phone}`),
    email: errors.email && t(`clinics.newClinic.errors.email.${errors.email}`),
  };

  const openNewClinic = () => {
    newClinic.reset();
    setIsNewClinicOpen(true);
  };

  const submitNewClinic = async () => {
    const created = await newClinic.submit();

    if (created) {
      setIsNewClinicOpen(false);
    }
  };

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-semibold">
          {t('partners.segments.clinics')}
        </Text>
      </View>

      <View className="px-4 pb-4">
        <Button
          shape="pill"
          className="h-[49px] w-full"
          onPress={openNewClinic}
        >
          <Icon as={Plus} className="size-5" />
          <Text className="font-semibold">{t('clinics.addClinic')}</Text>
        </Button>
      </View>

      <NewClinicSheet
        visible={isNewClinicOpen}
        draft={newClinic.draft}
        fieldErrors={fieldErrors}
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
    </View>
  );
}
