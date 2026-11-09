import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { InvoicesScreen } from './InvoicesScreen';
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet';
import { RecentInvoiceCard } from '../components/RecentInvoiceCard';
import { formatReportDate, type ReportInvoice } from '../domain/reportInvoice';
import { useRecentInvoices } from '../hooks/useRecentInvoices';
import { isInvoiceListAvailable } from '../services/availability';

export function RecentInvoicesSection() {
  const { t, locale } = useTranslation();
  const { invoices, status } = useRecentInvoices();
  const [selected, setSelected] = useState<ReportInvoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);

  const openDetail = (invoice: ReportInvoice) => {
    setSelected(invoice);
    setIsDetailOpen(true);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-xl font-bold uppercase text-label-primary">
          {t('invoices.title')}
        </Text>
        {isInvoiceListAvailable() ? (
          <Pressable
            onPress={() => setIsListOpen(true)}
            accessibilityRole="link"
          >
            <Text className="text-base text-label-tertiary">
              {t('invoices.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {status === 'loading' ? (
        <Text className="py-6 text-center text-sm text-label-tertiary">
          {t('invoices.loading')}
        </Text>
      ) : null}

      {status === 'failed' ? (
        <View className="px-4">
          <EmptyState message={t('invoices.error')} />
        </View>
      ) : null}

      {status === 'ready' && invoices.length === 0 ? (
        <View className="px-4">
          <EmptyState icon={FileText} message={t('invoices.empty')} />
        </View>
      ) : null}

      {invoices.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4 pb-4"
        >
          {invoices.map(invoice => (
            <RecentInvoiceCard
              key={invoice.id}
              taker={invoice.takerName}
              date={formatReportDate(invoice.issueDate, locale)}
              originalFileLabel={
                invoice.hasOriginalFile ? t('invoices.originalFile') : undefined
              }
              onPress={() => openDetail(invoice)}
            />
          ))}
        </ScrollView>
      ) : null}

      {selected ? (
        <InvoiceDetailSheet
          visible={isDetailOpen}
          title={t('invoices.detail.reportTitle')}
          closeLabel={t('invoices.detail.close')}
          rows={[
            { label: t('invoices.detail.taker'), value: selected.takerName },
            {
              label: t('invoices.detail.issuedAt'),
              value: formatReportDate(selected.issueDate, locale),
            },
            {
              label: t('invoices.detail.originalFile'),
              value: selected.hasOriginalFile
                ? t('invoices.detail.originalFileAvailable')
                : t('invoices.detail.originalFileUnavailable'),
            },
          ]}
          onClose={() => setIsDetailOpen(false)}
        />
      ) : null}

      {isInvoiceListAvailable() ? (
        <InvoicesScreen
          visible={isListOpen}
          onClose={() => setIsListOpen(false)}
        />
      ) : null}
    </View>
  );
}
