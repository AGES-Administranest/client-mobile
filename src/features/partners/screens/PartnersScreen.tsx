import { Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { ClinicsScreen } from 'features/clinics';
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
      {segment === 'clinics' ? (
        <ClinicsScreen />
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon={Truck} message={t('partners.suppliersEmpty')} />
        </View>
      )}
    </View>
  );
}
