import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { ServiceInvoicesSection } from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';

type ReportsScreenProps = {
  onOpenInvoice?: (id: string) => void;
  onSeeAllInvoices?: () => void;
};

export function ReportsScreen({
  onOpenInvoice,
  onSeeAllInvoices,
}: ReportsScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView contentContainerClassName="gap-4 pt-4">
      <Text className="px-4 text-4xl font-bold text-label-primary">
        {t('tabbar.reports')}
      </Text>
      <ServiceInvoicesSection
        onOpenInvoice={onOpenInvoice}
        onSeeAll={onSeeAllInvoices}
      />
      {/* Reserved for the "Adicionar nota" button (US01). */}
      <View className="mx-4 h-12" />
    </ScrollView>
  );
}
