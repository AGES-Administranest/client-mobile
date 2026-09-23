import { useState } from 'react';
import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import {
  ClinicDetailSheet,
  type Clinic,
} from '../components/ClinicDetailSheet';

const STUB_CLINIC: Clinic = {
  id: '1',
  name: 'Clínica VetNova',
  address: 'Rua das Hortênsias, 340 — Jardim Europeia',
  cityState: 'São Paulo, SP',
  phone: '(11) 3456-7890',
  responsible: 'Dr. André Matos',
};

export function ClinicsScreen() {
  const { t } = useTranslation();
  const [clinic, setClinic] = useState<Clinic | null>(STUB_CLINIC);
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1 px-4 pt-16">
      <Text className="mb-6 text-2xl font-bold text-label-primary">
        {t('clinics.title')}
      </Text>
      <ClinicDetailSheet
        visible={open}
        clinic={clinic}
        labels={{
          name: t('clinics.fields.name'),
          address: t('clinics.fields.address'),
          cityState: t('clinics.fields.cityState'),
          phone: t('clinics.fields.phone'),
          responsible: t('clinics.fields.responsible'),
          call: t('clinics.actions.call'),
          edit: t('clinics.actions.edit'),
          confirm: t('clinics.actions.confirm'),
          delete: t('clinics.actions.delete'),
          editTitle: t('clinics.editTitle'),
        }}
        onClose={() => setOpen(false)}
        onSave={updated => setClinic(updated)}
        onDelete={() => {
          setClinic(null);
          setOpen(false);
        }}
      />
    </View>
  );
}
