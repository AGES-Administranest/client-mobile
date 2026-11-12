import { useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl } from 'app/components/ui/segmented-control';
import { ClinicsScreen } from 'features/clinics';
import { SuppliersScreen } from 'features/suppliers';
import { useTranslation } from 'shared/i18n';

type PartnersSegment = 'clinics' | 'suppliers';

export function PartnersScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<PartnersSegment>('clinics');

  const segmentOptions = [
    { value: 'clinics', label: t('partners.segments.clinics') },
    { value: 'suppliers', label: t('partners.segments.suppliers') },
  ] as const;

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl
        options={segmentOptions}
        value={segment}
        onValueChange={setSegment}
      />
      {segment === 'clinics' ? <ClinicsScreen /> : <SuppliersScreen />}
    </View>
  );
}
