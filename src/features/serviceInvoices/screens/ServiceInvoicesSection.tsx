import { FileText } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { ServiceInvoiceCard } from '../components/ServiceInvoiceCard';
import { formatIssueDate } from '../domain/serviceInvoice';
import { useRecentServiceInvoices } from '../hooks/useRecentServiceInvoices';

type ServiceInvoicesSectionProps = {
  onOpenInvoice?: (id: string) => void;
  onSeeAll?: () => void;
};

export function ServiceInvoicesSection({
  onOpenInvoice,
  onSeeAll,
}: ServiceInvoicesSectionProps) {
  const { t } = useTranslation();
  const { invoices, status } = useRecentServiceInvoices();

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-xl font-bold uppercase text-label-primary">
          {t('serviceInvoices.title')}
        </Text>
        <Pressable onPress={onSeeAll} accessibilityRole="link">
          <Text className="text-base text-label-tertiary">
            {t('serviceInvoices.seeAll')}
          </Text>
        </Pressable>
      </View>
      {status === 'loading' ? (
        <View
          accessibilityLabel={t('serviceInvoices.loading')}
          className="items-center py-6"
        >
          <ActivityIndicator />
        </View>
      ) : status === 'failed' ? (
        <View className="px-4">
          <EmptyState message={t('serviceInvoices.error')} />
        </View>
      ) : invoices.length === 0 ? (
        <View className="px-4">
          <EmptyState icon={FileText} message={t('serviceInvoices.empty')} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4 pb-4"
        >
          {invoices.map(invoice => (
            <ServiceInvoiceCard
              key={invoice.id}
              clientName={invoice.clientName ?? t('serviceInvoices.noClient')}
              issueDate={
                invoice.issueDate
                  ? formatIssueDate(invoice.issueDate)
                  : t('serviceInvoices.noIssueDate')
              }
              originalFileLabel={
                invoice.hasOriginalFile
                  ? t('serviceInvoices.originalFile')
                  : undefined
              }
              onPress={() => onOpenInvoice?.(invoice.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
