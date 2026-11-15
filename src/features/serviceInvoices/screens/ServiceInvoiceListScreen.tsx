import { useState } from 'react';

import { useClientNames } from 'features/clients';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { STATUS_LABEL_KEYS } from './invoiceStatusLabelKeys';
import { ServiceInvoiceListPresentation } from '../components/ServiceInvoiceListPresentation';
import {
  filterInvoices,
  formatInvoiceDate,
} from '../domain/serviceInvoiceList';
import type { InvoiceStatusFilter } from '../domain/serviceInvoiceRecord.types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useServiceInvoices } from '../hooks/useServiceInvoices';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type ServiceInvoiceListScreenProps = {
  onOpenInvoice: (id: string) => void;
  onAddInvoice?: () => void;
  onBack: () => void;
};

export function ServiceInvoiceListScreen({
  onOpenInvoice,
  onAddInvoice,
  onBack,
}: ServiceInvoiceListScreenProps) {
  const { t, locale } = useTranslation();
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<InvoiceStatusFilter>('ALL');
  const search = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS);
  const invoices = useServiceInvoices({ pageSize: PAGE_SIZE, search });
  const clientNames = useClientNames();

  const visible = filterInvoices(invoices.items, { term: '', status: filter });

  return (
    <ServiceInvoiceListPresentation
      texts={{
        title: t('serviceInvoices.records.list.title'),
        back: t('serviceInvoices.records.list.back'),
        searchPlaceholder: t('serviceInvoices.records.list.searchPlaceholder'),
        filters: {
          ALL: t('serviceInvoices.records.list.filters.ALL'),
          SYNCED: t('serviceInvoices.records.list.filters.SYNCED'),
          PENDING: t('serviceInvoices.records.list.filters.PENDING'),
          ERROR: t('serviceInvoices.records.list.filters.ERROR'),
        },
        loading: t('common.loading'),
        loadFailed: t('serviceInvoices.records.list.loadFailed'),
        retry: t('common.retry'),
        offline: t('serviceInvoices.records.list.offline'),
        emptyTitle: t('serviceInvoices.records.list.emptyTitle'),
        emptyMessage: t('serviceInvoices.records.list.emptyMessage'),
        noResultsTitle: t('serviceInvoices.records.list.noResultsTitle'),
        noResultsMessage: t('serviceInvoices.records.list.noResultsMessage'),
        add: t('serviceInvoices.records.list.add'),
      }}
      status={invoices.status}
      isOffline={invoices.isOffline}
      rows={visible.map(invoice => ({
        id: invoice.id,
        title: invoice.number
          ? t('serviceInvoices.records.list.noteTitle', {
              number: invoice.number,
            })
          : t('serviceInvoices.records.list.noteTitleNoNumber'),
        issueDate: formatInvoiceDate(invoice.issueDate),
        clientLine: t('serviceInvoices.records.list.clientLine', {
          name: invoice.clientName || clientNames[invoice.clientId] || '',
        }),
        location: invoice.location,
        amount: formatCurrency(invoice.amount, locale),
        status: invoice.syncStatus,
        statusLabel: t(STATUS_LABEL_KEYS[invoice.syncStatus]),
        fileAvailableLabel: invoice.hasFile
          ? t('serviceInvoices.records.fileAvailable')
          : null,
        onPress: () => onOpenInvoice(invoice.id),
      }))}
      term={term}
      filter={filter}
      isFiltering={term.trim() !== '' || filter !== 'ALL'}
      isLoadingMore={invoices.isLoadingMore}
      hasMore={invoices.hasMore}
      onChangeTerm={setTerm}
      onChangeFilter={setFilter}
      onLoadMore={invoices.loadMore}
      onRetry={invoices.reload}
      onAddInvoice={onAddInvoice}
      onBack={onBack}
    />
  );
}
