import { ArrowLeft, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { ReportDetailModal } from './ReportDetailModal';
import { reportCardView } from './reportPresenter';
import { ReportCard } from '../components/ReportCard';
import { ReportListFooter } from '../components/ReportListFooter';
import type { ReportHistoryItem } from '../domain/report.types';
import type { ReportHistoryState } from '../hooks/useReportHistory';

const END_REACHED_THRESHOLD = 0.5;

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
  const {
    reports,
    downloadedIds,
    isLoading,
    isLoadingMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retry,
  } = history;

  const showError = hasError && reports.length === 0;
  const showEmpty = !isLoading && !hasError && reports.length === 0;

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <View className="h-11 flex-row items-center justify-center px-4">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('reports.history.back')}
          className="absolute left-4 size-9 items-center justify-center rounded-full bg-primary"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-[13px] font-semibold uppercase tracking-wide text-label-primary"
        >
          {t('reports.history.title')}
        </Text>
      </View>

      <View className="flex-1 gap-3 px-4 pt-4">
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

        <FlatList
          data={reports}
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
              onRetry={loadMore}
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
