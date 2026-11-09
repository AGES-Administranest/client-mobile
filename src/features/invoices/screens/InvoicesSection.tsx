import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { InvoiceDetailModal } from './InvoiceDetailModal';
import { invoiceCardView } from './invoicePresenter';
import { InvoiceCard } from '../components/InvoiceCard';
import type { Invoice } from '../domain/invoice.types';
import { EMPTY_INVOICE_FILTERS } from '../domain/invoiceFilters';
import { useInvoices } from '../hooks/useInvoices';
import { isInvoiceListAvailable } from '../services/availability';

const PREVIEW_COUNT = 5;

type InvoicesSectionProps = {
  onSeeAll: () => void;
};

function InvoicesSectionContent({ onSeeAll }: InvoicesSectionProps) {
  const { t, locale } = useTranslation();
  const { invoices, isLoading, hasError, retry } = useInvoices(
    EMPTY_INVOICE_FILTERS,
  );
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

      {isLoading ? (
        <Text className="text-sm text-label-tertiary">
          {t('invoices.loading')}
        </Text>
      ) : null}

      {hasError ? (
        <Text
          accessibilityRole="button"
          onPress={retry}
          className="text-sm text-label-tertiary"
        >
          {`${t('invoices.error')} ${t('common.retry')}`}
        </Text>
      ) : null}

      {!isLoading && !hasError && invoices.length === 0 ? (
        <Text className="text-sm text-label-tertiary">
          {t('invoices.empty')}
        </Text>
      ) : null}

      {invoices.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-3 px-4 pb-3"
        >
          {invoices.slice(0, PREVIEW_COUNT).map(invoice => (
            <InvoiceCard
              key={invoice.id}
              {...invoiceCardView(invoice, locale)}
              className="w-[141px] px-[23px] py-[17px]"
              onPress={() => {
                setSelected(invoice);
                setIsDetailOpen(true);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <InvoiceDetailModal
        invoice={selected}
        visible={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </View>
  );
}

export function InvoicesSection(props: InvoicesSectionProps) {
  return isInvoiceListAvailable() ? (
    <InvoicesSectionContent {...props} />
  ) : null;
}
