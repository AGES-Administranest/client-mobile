import { MapPin } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useClientNames } from 'features/clients';
import { useTranslation } from 'shared/i18n';

import { formatInvoiceDate } from '../domain/serviceInvoiceList';
import { useServiceInvoices } from '../hooks/useServiceInvoices';

const PREVIEW_COUNT = 5;

type ServiceInvoicesSectionProps = {
  onSeeAll: () => void;
  onOpenInvoice: (invoiceId: string) => void;
};

// The latest notes, from the same source as the full list.
export function ServiceInvoicesSection({
  onSeeAll,
  onOpenInvoice,
}: ServiceInvoicesSectionProps) {
  const { t } = useTranslation();
  const clientNames = useClientNames();
  const { items, status, reload } = useServiceInvoices({
    pageSize: PREVIEW_COUNT,
  });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-label-primary">
          {t('invoices.title')}
        </Text>
        <Text
          accessibilityRole="button"
          onPress={onSeeAll}
          className="text-xs text-label-quartenery"
        >
          {t('reports.seeAll')}
        </Text>
      </View>

      {status === 'loading' && items.length === 0 ? (
        <Text className="text-sm text-label-tertiary">
          {t('invoices.loading')}
        </Text>
      ) : null}

      {status === 'error' && items.length === 0 ? (
        <Text
          accessibilityRole="button"
          onPress={reload}
          className="text-sm text-label-tertiary"
        >
          {`${t('invoices.error')} ${t('common.retry')}`}
        </Text>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <Text className="text-sm text-label-tertiary">
          {t('invoices.empty')}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-3 px-4 pb-3"
        >
          {items.slice(0, PREVIEW_COUNT).map(invoice => {
            const clinic =
              invoice.clientName || clientNames[invoice.clientId] || '';
            const date = formatInvoiceDate(invoice.issueDate);

            return (
              <Pressable
                key={invoice.id}
                onPress={() => onOpenInvoice(invoice.id)}
                accessibilityRole="button"
                accessibilityLabel={`${clinic}, ${date}`}
                className="max-w-[260px] rounded-[14px] bg-white px-[23px] py-[17px] shadow-[0px_5px_5px_rgba(0,0,0,0.1)] active:opacity-80"
              >
                <Text className="text-[15px] font-semibold leading-[22.5px] text-label-primary">
                  {clinic}
                </Text>
                <Text className="text-xs font-light leading-[22.5px] text-label-primary">
                  {date}
                </Text>
                <View className="h-[26px] flex-row items-center gap-1">
                  <Icon as={MapPin} size={11} className="text-label-tertiary" />
                  <Text className="text-xs leading-[18px] text-label-tertiary">
                    {invoice.location ?? ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
