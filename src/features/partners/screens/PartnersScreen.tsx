import { Plus, Truck } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { PartnerCard } from 'app/components/ui/partner-card';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { usePartnersScreen } from '../hooks/usePartnersScreen';

export function PartnersScreen() {
  const { t } = useTranslation();
  const { segment, onSegmentChange, clinics, error } = usePartnersScreen();

  const segmentOptions = [
    { value: 'clinics', label: t('partners.segments.clinics') },
    { value: 'suppliers', label: t('partners.segments.suppliers') },
  ] as const;

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <SegmentedControl
        options={segmentOptions}
        value={segment}
        onValueChange={onSegmentChange}
      />
      {error && (
        <View className="rounded-xl bg-destructive/10 px-4 py-3">
          <Text className="text-sm text-destructive">{t(error)}</Text>
        </View>
      )}
      {segment === 'clinics' ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 pt-3 pb-4"
        >
          <Text className="text-[13px] font-semibold uppercase leading-[19.5px] tracking-[0.52px]">
            {t(
              clinics.length === 1
                ? 'partners.clinicsCountOne'
                : 'partners.clinicsCountOther',
              { count: clinics.length },
            )}
          </Text>
          {clinics.map(clinic => (
            <PartnerCard
              key={clinic.id}
              name={clinic.name}
              location={`${clinic.city}, ${clinic.state}`}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon={Truck} message={t('partners.suppliersEmpty')} />
        </View>
      )}
      <Button shape="pill" icon={Plus} className="mb-[16px] h-[49px] w-full">
        <Text>{t('partners.addClinic')}</Text>
      </Button>
    </View>
  );
}
