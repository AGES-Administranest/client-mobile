import { Hospital, RotateCw } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { EmptyState } from 'app/components/ui/empty-state';
import { Skeleton } from 'app/components/ui/skeleton';
import { StatCard } from 'app/components/ui/stat-card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const CARD =
  'overflow-hidden rounded-[14px] bg-white shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]';
const SKELETON_ROWS = 4;

type ClinicHistoryStatus = 'loading' | 'ready' | 'failed';

type ClinicHistoryTexts = {
  billed: string;
  appointments: string;
  trips: string;
  listTitle: string;
  loading: string;
  loadingMore: string;
  emptyTitle: string;
  emptyMessage: string;
  retry: string;
};

type ClinicHistoryTotals = {
  billed: string;
  appointments: string;
  tripCost: string;
  tripCount: string;
};

type ClinicHistoryRow = {
  id: string;
  title: string;
  detail: string;
  amount: string;
};

type ClinicHistoryProps = {
  texts: ClinicHistoryTexts;
  status: ClinicHistoryStatus;
  failureMessage: string | null;
  totals: ClinicHistoryTotals;
  rows: ClinicHistoryRow[];
  showMoreLabel: string | null;
  isLoadingMore: boolean;
  periodField: ReactNode;
  onShowMore: () => void;
  onRetry: () => void;
};

function HistoryTotals({
  texts,
  totals,
  loading,
}: {
  texts: ClinicHistoryTexts;
  totals: ClinicHistoryTotals;
  loading: boolean;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <StatCard
          label={texts.billed}
          value={totals.billed}
          loading={loading}
        />
        <StatCard
          label={texts.appointments}
          value={totals.appointments}
          loading={loading}
        />
      </View>
      <View className="flex-row">
        <StatCard
          label={texts.trips}
          value={totals.tripCost}
          detail={totals.tripCount}
          loading={loading}
        />
      </View>
    </View>
  );
}

function HistoryListSkeleton({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className={CARD}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View
          key={index}
          className={cn(
            'flex-row items-center gap-3 px-3.5 py-3.5',
            index < SKELETON_ROWS - 1 && 'border-b border-border-primary',
          )}
        >
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-3 w-[140px]" />
            <Skeleton className="h-2.5 w-[90px]" />
          </View>
          <Skeleton className="h-3 w-14" />
        </View>
      ))}
    </View>
  );
}

function HistoryList({
  rows,
  showMoreLabel,
  loadingMoreLabel,
  isLoadingMore,
  onShowMore,
}: {
  rows: ClinicHistoryRow[];
  showMoreLabel: string | null;
  loadingMoreLabel: string;
  isLoadingMore: boolean;
  onShowMore: () => void;
}) {
  return (
    <View className={CARD}>
      {rows.map((row, index) => (
        <View
          key={row.id}
          accessible
          className={cn(
            'flex-row items-center gap-3 px-3.5 py-3',
            (index < rows.length - 1 || showMoreLabel) &&
              'border-b border-border-primary',
          )}
        >
          <View className="min-w-0 flex-1 gap-0.5">
            <Text
              numberOfLines={1}
              className="text-sm font-semibold text-label-primary"
            >
              {row.title}
            </Text>
            <Text numberOfLines={1} className="text-xs text-label-tertiary">
              {row.detail}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-label-primary">
            {row.amount}
          </Text>
        </View>
      ))}
      {showMoreLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isLoadingMore }}
          disabled={isLoadingMore}
          onPress={onShowMore}
          className="items-center py-3"
        >
          <Text className="text-[13px] font-semibold text-label-quartenery">
            {isLoadingMore ? loadingMoreLabel : showMoreLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ClinicHistory({
  texts,
  status,
  failureMessage,
  totals,
  rows,
  showMoreLabel,
  isLoadingMore,
  periodField,
  onShowMore,
  onRetry,
}: ClinicHistoryProps) {
  // O VoiceOver não lê sozinho o aviso que aparece no lugar da lista; o role e
  // a live region só resolvem no Android e na web.
  useEffect(() => {
    if (status === 'failed' && failureMessage) {
      AccessibilityInfo.announceForAccessibility(failureMessage);
    }
  }, [status, failureMessage]);

  const listTitle = (
    <Text className="text-[13px] font-semibold text-label-primary">
      {texts.listTitle}
    </Text>
  );

  if (status === 'failed') {
    return (
      <View className="gap-4">
        {periodField}
        <View className="gap-3">
          {listTitle}
          <View role="alert" accessibilityLiveRegion="polite">
            <EmptyState
              message={failureMessage ?? undefined}
              action={{ label: texts.retry, icon: RotateCw, onPress: onRetry }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {periodField}
      <HistoryTotals
        texts={texts}
        totals={totals}
        loading={status === 'loading'}
      />
      <View className="gap-3">
        {listTitle}
        {status === 'loading' ? (
          <HistoryListSkeleton label={texts.loading} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Hospital}
            title={texts.emptyTitle}
            titleClassName="text-base leading-6 text-label-quartenery"
            message={texts.emptyMessage}
          />
        ) : (
          <HistoryList
            rows={rows}
            showMoreLabel={showMoreLabel}
            loadingMoreLabel={texts.loadingMore}
            isLoadingMore={isLoadingMore}
            onShowMore={onShowMore}
          />
        )}
      </View>
    </View>
  );
}

export { ClinicHistory };
export type {
  ClinicHistoryProps,
  ClinicHistoryRow,
  ClinicHistoryStatus,
  ClinicHistoryTexts,
  ClinicHistoryTotals,
};
