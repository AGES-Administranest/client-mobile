import { ArrowLeft, FileText, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services/network';

import { InvoiceDetailModal } from './InvoiceDetailModal';
import { invoiceCardView } from './invoicePresenter';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceListFooter } from '../components/InvoiceListFooter';
import { TaxPackageDownload } from '../components/TaxPackageDownload';
import type { Invoice } from '../domain/invoice.types';
import { EMPTY_INVOICE_FILTERS } from '../domain/invoiceFilters';
import { useInvoices } from '../hooks/useInvoices';
import { useTaxPackageDownload } from '../hooks/useTaxPackageDownload';

const END_REACHED_THRESHOLD = 0.5;

const TAX_PACKAGE_MESSAGE = {
  idle: null,
  downloading: 'invoices.downloadAll.downloading',
  done: 'invoices.downloadAll.done',
  empty: 'invoices.downloadAll.empty',
  tooLarge: 'invoices.downloadAll.tooLarge',
  rateLimited: 'invoices.downloadAll.rateLimited',
  offline: 'invoices.downloadAll.offline',
  failed: 'invoices.downloadAll.failed',
} as const;

export type InvoicesScreenProps = {
  visible: boolean;
  onClose: () => void;
  onAddInvoice: () => void;
  /** iOS: the exit finished, so another Modal or the system picker may open. */
  onDismiss?: () => void;
};

function InvoiceSeparator() {
  return <View className="h-3" />;
}

type InvoicesContentProps = Pick<
  InvoicesScreenProps,
  'onClose' | 'onAddInvoice'
>;

function InvoicesContent({ onClose, onAddInvoice }: InvoicesContentProps) {
  const { t, locale } = useTranslation();
  const {
    invoices,
    total,
    isLoading,
    isLoadingMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retry,
  } = useInvoices(EMPTY_INVOICE_FILTERS);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const taxPackage = useTaxPackageDownload();
  const taxPackageMessageKey = TAX_PACKAGE_MESSAGE[taxPackage.status];

  useEffect(() => onConnectionRestored(retry), [retry]);

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setIsDetailOpen(true);
  };

  const showError = hasError && invoices.length === 0;
  const showEmpty = !isLoading && !hasError && invoices.length === 0;

  return (
    <>
      <View className="h-11 flex-row items-center justify-center px-4">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('invoices.back')}
          className="absolute left-4 size-9 items-center justify-center rounded-full bg-primary"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-[13px] font-semibold uppercase tracking-wide text-label-primary"
        >
          {t(total === 1 ? 'invoices.countSingular' : 'invoices.countPlural', {
            count: total,
          })}
        </Text>
      </View>

      <View className="flex-1 gap-3 px-4 pt-4">
        {isLoading ? (
          <Text className="py-6 text-center text-sm text-label-tertiary">
            {t('invoices.loading')}
          </Text>
        ) : null}

        {showError ? (
          <View className="items-center gap-2 py-6">
            <Text className="text-sm text-label-tertiary">
              {t('invoices.error')}
            </Text>
            <Text
              accessibilityRole="button"
              onPress={retry}
              className="text-sm font-semibold text-label-quartenery"
            >
              {t('common.retry')}
            </Text>
          </View>
        ) : null}

        {showEmpty ? (
          <EmptyState icon={FileText} message={t('invoices.empty')} />
        ) : null}

        <FlatList
          data={invoices}
          keyExtractor={invoice => invoice.id}
          renderItem={({ item }) => (
            <InvoiceCard
              {...invoiceCardView(item, locale)}
              onPress={() => openDetail(item)}
            />
          )}
          ItemSeparatorComponent={InvoiceSeparator}
          onEndReached={loadMore}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          contentContainerClassName="pb-6"
          ListFooterComponent={
            <InvoiceListFooter
              isLoadingMore={isLoadingMore}
              loadMoreFailed={loadMoreFailed}
              loadingLabel={t('invoices.loadingMore')}
              errorLabel={t('invoices.loadMoreError')}
              retryLabel={t('common.retry')}
              onRetry={loadMore}
            />
          }
        />

        <View className="mb-4 gap-3">
          <TaxPackageDownload
            label={t('invoices.downloadAll.button')}
            message={taxPackageMessageKey ? t(taxPackageMessageKey) : null}
            isDownloading={taxPackage.status === 'downloading'}
            onPress={taxPackage.download}
          />
          <Button
            shape="pill"
            icon={Plus}
            className="h-[49px] w-full"
            onPress={onAddInvoice}
          >
            <Text>{t('invoices.addInvoice')}</Text>
          </Button>
        </View>
      </View>

      <InvoiceDetailModal
        invoice={selected}
        visible={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}

export function InvoicesScreen({
  visible,
  onClose,
  onAddInvoice,
  onDismiss,
}: InvoicesScreenProps) {
  return (
    <FullScreenModal
      visible={visible}
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <InvoicesContent onClose={onClose} onAddInvoice={onAddInvoice} />
    </FullScreenModal>
  );
}