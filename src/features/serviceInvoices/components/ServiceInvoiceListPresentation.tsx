import { FileText, Plus, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { ScreenHeader } from 'app/components/ui/screen-header';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

import {
  ServiceInvoiceListItem,
  type ServiceInvoiceListItemProps,
} from './ServiceInvoiceListItem';
import type { InvoiceStatusFilter } from '../domain/serviceInvoiceRecord.types';

const LOAD_MORE_THRESHOLD_PX = 200;

export type ServiceInvoiceListRow = ServiceInvoiceListItemProps & {
  id: string;
};

export type ServiceInvoiceListTexts = {
  title: string;
  back: string;
  searchPlaceholder: string;
  filters: Record<InvoiceStatusFilter, string>;
  loading: string;
  loadFailed: string;
  retry: string;
  offline: string;
  emptyTitle: string;
  emptyMessage: string;
  noResultsTitle: string;
  noResultsMessage: string;
  add: string;
  addHint: string;
};

const FILTER_ORDER: InvoiceStatusFilter[] = [
  'ALL',
  'SYNCED',
  'PENDING',
  'ERROR',
];

type ServiceInvoiceListPresentationProps = {
  texts: ServiceInvoiceListTexts;
  status: 'loading' | 'ready' | 'error';
  isOffline: boolean;
  rows: ServiceInvoiceListRow[];
  term: string;
  filter: InvoiceStatusFilter;
  isFiltering: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onChangeTerm: (term: string) => void;
  onChangeFilter: (filter: InvoiceStatusFilter) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onAddInvoice?: () => void;
  extraAction?: ReactNode;
  onBack: () => void;
};

export function ServiceInvoiceListPresentation({
  texts,
  status,
  isOffline,
  rows,
  term,
  filter,
  isFiltering,
  isLoadingMore,
  hasMore,
  onChangeTerm,
  onChangeFilter,
  onLoadMore,
  onRetry,
  onAddInvoice,
  extraAction,
  onBack,
}: ServiceInvoiceListPresentationProps) {
  const isEmpty = status === 'ready' && rows.length === 0;

  return (
    <View className="flex-1">
      <ScreenHeader
        title={texts.title}
        backLabel={texts.back}
        onBack={onBack}
      />

      <View className="gap-3 px-4 pb-3">
        <View className="flex-row items-center gap-2 rounded-xl bg-white px-3 shadow-md shadow-black/10">
          <Icon as={Search} size={18} className="text-label-tertiary" />
          <TextInput
            accessibilityLabel={texts.searchPlaceholder}
            value={term}
            onChangeText={onChangeTerm}
            placeholder={texts.searchPlaceholder}
            placeholderTextColor={LabelPlaceholder}
            autoCorrect={false}
            className="h-11 flex-1 text-sm text-label-primary"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {FILTER_ORDER.map(option => {
            const isSelected = option === filter;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChangeFilter(option)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 shadow-md shadow-black/10',
                  isSelected ? 'bg-button-primary' : 'bg-white',
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    isSelected ? 'text-label-secondary' : 'text-label-primary',
                  )}
                >
                  {texts.filters[option]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-4 pb-6"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - LOAD_MORE_THRESHOLD_PX;
          if (isCloseToBottom && hasMore && !isLoadingMore) onLoadMore();
        }}
      >
        {isOffline && status === 'ready' ? (
          <NoticeBanner tone="info" message={texts.offline} />
        ) : null}

        {status === 'loading' && rows.length === 0 ? (
          <ActivityIndicator
            accessibilityLabel={texts.loading}
            className="py-8"
          />
        ) : null}

        {status === 'error' ? (
          <View className="items-center gap-3 rounded-2xl bg-white px-6 py-8">
            <Text className="text-center text-[13px] text-label-tertiary">
              {texts.loadFailed}
            </Text>
            <Button
              shape="pill"
              size="sm"
              className="h-8 px-3.5"
              onPress={onRetry}
            >
              <Text className="text-xs font-semibold">{texts.retry}</Text>
            </Button>
          </View>
        ) : null}

        {isEmpty && !isFiltering ? (
          <EmptyState
            icon={FileText}
            title={texts.emptyTitle}
            message={texts.emptyMessage}
            titleClassName="text-base leading-6 text-label-quartenery"
            messageClassName="text-[13px] leading-[19.5px]"
            action={
              onAddInvoice
                ? { label: texts.add, icon: Plus, onPress: onAddInvoice }
                : undefined
            }
            className="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]"
          />
        ) : null}

        {isEmpty && isFiltering ? (
          <EmptyState
            icon={Search}
            title={texts.noResultsTitle}
            message={texts.noResultsMessage}
          />
        ) : null}

        {rows.map(({ id, ...row }) => (
          <ServiceInvoiceListItem key={id} {...row} />
        ))}

        {isLoadingMore ? (
          <ActivityIndicator size="small" className="py-4" />
        ) : null}
      </ScrollView>

      {onAddInvoice && !(isEmpty && !isFiltering) ? (
        <View className="gap-3 px-4 pb-4 pt-2">
          {extraAction}
          <ActionButton
            label={texts.add}
            icon={<Icon as={Plus} size={18} />}
            onPress={onAddInvoice}
          />
          <Text className="text-center text-xs text-label-tertiary">
            {texts.addHint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
