import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { reportCardView } from './reportPresenter';
import { ReportCard } from '../components/ReportCard';
import type { ReportHistoryState } from '../hooks/useReportHistory';

const PREVIEW_COUNT = 5;

type ReportHistorySectionProps = {
  history: ReportHistoryState;
  onSeeAll: () => void;
};

export function ReportHistorySection({
  history,
  onSeeAll,
}: ReportHistorySectionProps) {
  const { t, locale } = useTranslation();
  const { reports, downloadedIds, isLoading, hasError, retry } = history;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-label-primary">
          {t('reports.history.title')}
        </Text>
        {reports.length > 0 ? (
          <Text
            accessibilityRole="button"
            onPress={onSeeAll}
            className="text-xs text-label-quartenery"
          >
            {t('reports.seeAll')}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <Text className="text-sm text-label-tertiary">
          {t('reports.history.loading')}
        </Text>
      ) : null}

      {hasError ? (
        <Text
          accessibilityRole="button"
          onPress={retry}
          className="text-sm text-label-tertiary"
        >
          {`${t('reports.history.error')} ${t('common.retry')}`}
        </Text>
      ) : null}

      {!isLoading && !hasError && reports.length === 0 ? (
        <Text className="text-sm text-label-tertiary">
          {t('reports.history.empty')}
        </Text>
      ) : null}

      {reports.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-3 px-4 pb-3"
        >
          {reports.slice(0, PREVIEW_COUNT).map(report => (
            <ReportCard
              key={report.id}
              {...reportCardView(
                report,
                downloadedIds.has(report.id),
                t,
                locale,
              )}
              className="w-[215px]"
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
