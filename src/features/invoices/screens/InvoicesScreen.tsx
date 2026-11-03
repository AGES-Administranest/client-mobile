import { FileText } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { MovementFilters } from 'app/components/ui/MovementFilters';
import { ScreenHeader } from 'app/components/ui/screen-header';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services/network';
import {
  fromCalendarDate,
  isRangeComplete,
  type CalendarRange,
} from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { invoiceCardView, invoiceDetailRows } from './invoicePresenter';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet';
import { InvoiceListFooter } from '../components/InvoiceListFooter';
import type { Invoice } from '../domain/invoice.types';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import { useInvoices } from '../hooks/useInvoices';

const END_REACHED_THRESHOLD = 0.5;

export type InvoicesScreenProps = {
  visible: boolean;
  onClose: () => void;
};

function InvoiceSeparator() {
  return <View className="h-3" />;
}

function InvoicesContent({ onClose }: Pick<InvoicesScreenProps, 'onClose'>) {
  const { t, locale } = useTranslation();
  const {
    filters,
    isFiltering,
    isRangeInverted,
    setSearch,
    setRange,
    clearFilters,
  } = useInvoiceFilters();
  const {
    invoices,
    isLoading,
    isLoadingMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retry,
  } = useInvoices(filters);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => onConnectionRestored(retry), [retry]);

  const periodLabel = (range: CalendarRange) => {
    if (range.from === null) {
      return t('invoices.filters.period');
    }

    const from = formatDayAndMonth(fromCalendarDate(range.from), locale);

    if (range.to === null) {
      return t('invoices.filters.periodFrom', { from });
    }

    if (range.to === range.from) {
      return t('invoices.filters.periodSingle', { day: from });
    }

    return t('invoices.filters.periodRange', {
      from,
      to: formatDayAndMonth(fromCalendarDate(range.to), locale),
    });
  };

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setIsDetailOpen(true);
  };

  const showError = hasError && invoices.length === 0;
  const showEmpty = !isLoading && !hasError && invoices.length === 0;

  return (
    <>
      <ScreenHeader
        title={t('invoices.title')}
        backLabel={t('invoices.back')}
        onBack={onClose}
      />

      <View className="flex-1 gap-3 px-4">
        <MovementFilters
          itemName={filters.search}
          onItemNameChange={setSearch}
          range={filters.range}
          onRangeChange={range => {
            setRange(range);

            if (isRangeComplete(range)) {
              setIsCalendarOpen(false);
            }
          }}
          isCalendarOpen={isCalendarOpen}
          onToggleCalendar={() => setIsCalendarOpen(open => !open)}
          onClear={() => {
            clearFilters();
            setIsCalendarOpen(false);
          }}
          canClear={isFiltering}
          locale={locale}
          searchPlaceholder={t('invoices.filters.searchPlaceholder')}
          periodLabel={periodLabel(filters.range)}
          clearLabel={t('invoices.filters.clear')}
          previousMonthLabel={t('invoices.filters.previousMonth')}
          nextMonthLabel={t('invoices.filters.nextMonth')}
        />

        {isRangeInverted ? (
          <Text
            className="text-xs text-alert-primary"
            accessibilityRole="alert"
          >
            {t('invoices.filters.invalidRange')}
          </Text>
        ) : null}

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
          <EmptyState
            icon={FileText}
            message={t(
              isFiltering ? 'invoices.emptyFiltered' : 'invoices.empty',
            )}
          />
        ) : null}

        <FlatList
          data={invoices}
          keyExtractor={invoice => invoice.id}
          renderItem={({ item }) => (
            <InvoiceCard
              {...invoiceCardView(item, t, locale)}
              onPress={() => openDetail(item)}
            />
          )}
          ItemSeparatorComponent={InvoiceSeparator}
          onEndReached={loadMore}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          keyboardShouldPersistTaps="handled"
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
      </View>

      {selected ? (
        <InvoiceDetailSheet
          visible={isDetailOpen}
          title={t('invoices.detail.title', { number: selected.number })}
          closeLabel={t('invoices.detail.close')}
          rows={invoiceDetailRows(selected, t, locale)}
          onClose={() => setIsDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

export function InvoicesScreen({ visible, onClose }: InvoicesScreenProps) {
  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <InvoicesContent onClose={onClose} />
    </FullScreenModal>
  );
}
