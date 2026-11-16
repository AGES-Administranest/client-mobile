import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { ModalHeader } from 'app/components/ui/modal-header';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

import { ReportDetailModal } from './ReportDetailModal';
import { reportCardView } from './reportPresenter';
import { ReportCard } from '../components/ReportCard';
import { ReportListFooter } from '../components/ReportListFooter';
import type {
  ReportHistoryItem,
  StoredReportKind,
} from '../domain/report.types';
import type { ReportHistoryState } from '../hooks/useReportHistory';

const END_REACHED_THRESHOLD = 0.5;

type KindFilter = 'ALL' | StoredReportKind;

const FILTER_ORDER: KindFilter[] = ['ALL', 'GENERAL_REPORT', 'TAX_PACKAGE'];

type ReportHistoryScreenProps = {
  visible: boolean;
  history: ReportHistoryState;
  onClose: () => void;
};

function ReportSeparator() {
  return <View className="h-3" />;
}

export function ReportHistoryScreen({
  visible,
  history,
  onClose,
}: ReportHistoryScreenProps) {
  const { t, locale } = useTranslation();
  const [selected, setSelected] = useState<ReportHistoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filter, setFilter] = useState<KindFilter>('ALL');
  const {
    reports,
    downloadedIds,
    isLoading,
    isLoadingMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retryLoadMore,
    retry,
  } = history;

  const filtered =
    filter === 'ALL'
      ? reports
      : reports.filter(report => report.kind === filter);
  const showError = hasError && reports.length === 0;
  const showEmpty = !isLoading && !hasError && reports.length === 0;
  const showNoResults =
    !showEmpty && !isLoading && filtered.length === 0 && reports.length > 0;

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <ModalHeader
        title={t('reports.history.title')}
        backLabel={t('reports.history.back')}
        onBack={onClose}
      />

      <View className="flex-1 gap-3 px-4 pt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="grow-0"
          contentContainerClassName="gap-2 px-1 pb-3 pt-1"
        >
          {FILTER_ORDER.map(option => {
            const isSelected = option === filter;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setFilter(option)}
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
                  {option === 'ALL'
                    ? t('reports.history.filterAll')
                    : t(`reports.history.kinds.${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <Text className="py-6 text-center text-sm text-label-tertiary">
            {t('reports.history.loading')}
          </Text>
        ) : null}

        {showError ? (
          <View className="items-center gap-2 py-6">
            <Text className="text-sm text-label-tertiary">
              {t('reports.history.error')}
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
          <EmptyState icon={FileText} message={t('reports.history.empty')} />
        ) : null}

        {showNoResults ? (
          <EmptyState
            icon={FileText}
            message={t('reports.history.noResults')}
          />
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={report => report.id}
          renderItem={({ item }) => (
            <ReportCard
              {...reportCardView(item, downloadedIds.has(item.id), t, locale)}
              onPress={() => {
                setSelected(item);
                setIsDetailOpen(true);
              }}
            />
          )}
          ItemSeparatorComponent={ReportSeparator}
          onEndReached={loadMore}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          contentContainerClassName="pb-6"
          ListFooterComponent={
            <ReportListFooter
              isLoadingMore={isLoadingMore}
              loadMoreFailed={loadMoreFailed}
              loadingLabel={t('reports.history.loadingMore')}
              errorLabel={t('reports.history.loadMoreError')}
              retryLabel={t('common.retry')}
              onRetry={retryLoadMore}
            />
          }
        />
      </View>

      <ReportDetailModal
        report={selected}
        visible={isDetailOpen}
        isDownloaded={selected ? downloadedIds.has(selected.id) : false}
        onClose={() => setIsDetailOpen(false)}
        onDownloaded={history.markDownloaded}
        onDeleted={history.forget}
      />
    </FullScreenModal>
  );
}
