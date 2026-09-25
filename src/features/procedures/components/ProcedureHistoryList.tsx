import { ClipboardList } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';

import {
  ProcedureHistoryCard,
  type ProcedureHistoryCardProps,
} from './ProcedureHistoryCard';

const END_REACHED_THRESHOLD = 0.5;

export type ProcedureHistoryListItem = { id: string } & Pick<
  ProcedureHistoryCardProps,
  | 'date'
  | 'procedureName'
  | 'patientName'
  | 'speciesLabel'
  | 'asaLabel'
  | 'clientName'
  | 'amount'
>;

export type ProcedureHistoryListError = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

type ProcedureHistoryListProps = {
  items: readonly ProcedureHistoryListItem[];
  header: ReactElement;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadingMoreLabel: string;
  emptyMessage: string;
  error?: ProcedureHistoryListError;
  onPressItem: (id: string) => void;
  onEndReached: () => void;
};

export function ProcedureHistoryList({
  items,
  header,
  isLoading,
  isLoadingMore,
  loadingMoreLabel,
  emptyMessage,
  error,
  onPressItem,
  onEndReached,
}: ProcedureHistoryListProps) {
  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ProcedureHistoryCard
          patientName={item.patientName}
          speciesLabel={item.speciesLabel}
          asaLabel={item.asaLabel}
          procedureName={item.procedureName}
          clientName={item.clientName}
          date={item.date}
          amount={item.amount}
          onPress={() => onPressItem(item.id)}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyBody
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          error={error}
        />
      }
      ListFooterComponent={
        items.length > 0 ? (
          <Footer
            isLoadingMore={isLoadingMore}
            loadingMoreLabel={loadingMoreLabel}
            error={error}
          />
        ) : null
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      contentContainerClassName="gap-3 px-4 pb-24 pt-4"
      keyboardShouldPersistTaps="handled"
    />
  );
}

type EmptyBodyProps = {
  isLoading: boolean;
  emptyMessage: string;
  error?: ProcedureHistoryListError;
};

function EmptyBody({ isLoading, emptyMessage, error }: EmptyBodyProps) {
  if (isLoading) {
    return <ActivityIndicator className="my-6" />;
  }
  if (error) {
    return <ErrorBlock error={error} />;
  }

  return <EmptyState icon={ClipboardList} message={emptyMessage} />;
}

type FooterProps = {
  isLoadingMore: boolean;
  loadingMoreLabel: string;
  error?: ProcedureHistoryListError;
};

function Footer({ isLoadingMore, loadingMoreLabel, error }: FooterProps) {
  if (error) {
    return <ErrorBlock error={error} />;
  }
  if (!isLoadingMore) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center gap-2 py-3">
      <ActivityIndicator />
      <Text variant="muted">{loadingMoreLabel}</Text>
    </View>
  );
}

function ErrorBlock({ error }: { error: ProcedureHistoryListError }) {
  return (
    <View className="items-center gap-3 py-6">
      <Text variant="muted" className="text-center">
        {error.message}
      </Text>
      <Button shape="pill" onPress={error.onRetry}>
        <Text>{error.retryLabel}</Text>
      </Button>
    </View>
  );
}
