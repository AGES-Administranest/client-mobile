import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { ServiceInvoiceCard } from '../components/ServiceInvoiceCard';
import { ServiceInvoiceDetailSheet } from '../components/ServiceInvoiceDetailSheet';
import {
  formatIssueDate,
  RECENT_INVOICES_LIMIT,
  type ServiceInvoice,
} from '../domain/serviceInvoice';
import { useServiceInvoices } from '../hooks/useServiceInvoices';
import { MAX_PAGE_SIZE } from '../services/serviceInvoiceService';

export function ServiceInvoicesSection() {
  const { t } = useTranslation();
  const { invoices, status } = useServiceInvoices(RECENT_INVOICES_LIMIT);
  const [openInvoice, setOpenInvoice] = useState<ServiceInvoice | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);

  const openDetail = (invoice: ServiceInvoice) => {
    setOpenInvoice(invoice);
    setDetailVisible(true);
  };

  const detailFields = openInvoice
    ? [
        {
          label: t('serviceInvoices.detail.taker'),
          value: openInvoice.takerName ?? t('serviceInvoices.noTaker'),
        },
        {
          label: t('serviceInvoices.detail.issueDate'),
          value: openInvoice.issueDate
            ? formatIssueDate(openInvoice.issueDate)
            : t('serviceInvoices.noIssueDate'),
        },
        {
          label: t('serviceInvoices.detail.originalFile'),
          value: openInvoice.hasOriginalFile
            ? t('serviceInvoices.detail.originalFileAvailable')
            : t('serviceInvoices.detail.originalFileUnavailable'),
        },
      ]
    : [];

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-xl font-bold uppercase text-label-primary">
          {t('serviceInvoices.title')}
        </Text>
        <Pressable
          onPress={() => setListVisible(true)}
          accessibilityRole="link"
        >
          <Text className="text-base text-label-tertiary">
            {t('serviceInvoices.seeAll')}
          </Text>
        </Pressable>
      </View>

      <InvoicesFeedback status={status} isEmpty={invoices.length === 0}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4 pb-4"
        >
          {invoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onPress={() => openDetail(invoice)}
            />
          ))}
        </ScrollView>
      </InvoicesFeedback>

      <ServiceInvoiceDetailSheet
        visible={detailVisible}
        title={t('serviceInvoices.detail.title')}
        closeLabel={t('serviceInvoices.close')}
        fields={detailFields}
        onClose={() => setDetailVisible(false)}
      />

      <BottomSheet
        visible={listVisible}
        title={t('serviceInvoices.list.title')}
        closeLabel={t('serviceInvoices.close')}
        onClose={() => setListVisible(false)}
      >
        <AllServiceInvoices />
      </BottomSheet>
    </View>
  );
}

// Inside the sheet so the notes are only fetched while the list is open.
function AllServiceInvoices() {
  const { invoices, status } = useServiceInvoices(MAX_PAGE_SIZE);

  return (
    <InvoicesFeedback status={status} isEmpty={invoices.length === 0}>
      {invoices.map(invoice => (
        <InvoiceCard key={invoice.id} invoice={invoice} className="w-full" />
      ))}
    </InvoicesFeedback>
  );
}

type InvoicesFeedbackProps = {
  status: 'loading' | 'ready' | 'failed';
  isEmpty: boolean;
  children: React.ReactNode;
};

function InvoicesFeedback({
  status,
  isEmpty,
  children,
}: InvoicesFeedbackProps) {
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <View
        accessibilityLabel={t('serviceInvoices.loading')}
        className="items-center py-6"
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View className="px-4">
        <EmptyState message={t('serviceInvoices.error')} />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="px-4">
        <EmptyState icon={FileText} message={t('serviceInvoices.empty')} />
      </View>
    );
  }

  return <>{children}</>;
}

type InvoiceCardProps = {
  invoice: ServiceInvoice;
  onPress?: () => void;
  className?: string;
};

function InvoiceCard({ invoice, onPress, className }: InvoiceCardProps) {
  const { t } = useTranslation();

  return (
    <ServiceInvoiceCard
      takerName={invoice.takerName ?? t('serviceInvoices.noTaker')}
      issueDate={
        invoice.issueDate
          ? formatIssueDate(invoice.issueDate)
          : t('serviceInvoices.noIssueDate')
      }
      originalFileLabel={
        invoice.hasOriginalFile ? t('serviceInvoices.originalFile') : undefined
      }
      onPress={onPress}
      className={className}
    />
  );
}
