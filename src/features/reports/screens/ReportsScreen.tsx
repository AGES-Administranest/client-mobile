import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import {
  isInvoiceListAvailable,
  RecentInvoicesSection,
} from 'features/invoices';
import { useTranslation } from 'shared/i18n';

export function ReportsScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView contentContainerClassName="gap-4 pt-4">
      <Text className="px-4 text-4xl font-bold text-label-primary">
        {t('reports.title')}
      </Text>
      {isInvoiceListAvailable() ? <RecentInvoicesSection /> : null}
      {/* Reserved for the "Adicionar nota" button (US01). */}
      <View className="mx-4 h-12" />
    </ScrollView>
  );
}
