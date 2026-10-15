import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Plus,
  Receipt,
  RotateCw,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { EntryNature } from '../domain/financialEntry';

export type StatementItem = {
  id: string;
  nature: EntryNature;
  description: string;
  date: string;
  category: string;
  amount: string;
  isAutomatic: boolean;
};

export type StatementTexts = {
  loading: string;
  loadingMore: string;
  automatic: string;
  retry: string;
  loadMoreFailure: string;
  empty: { title: string; description: string; action: string };
};

export type StatementStatus = 'loading' | 'ready' | 'failed';

type StatementListProps = {
  items: readonly StatementItem[];
  status: StatementStatus;
  isLoadingMore: boolean;
  loadMoreFailed?: boolean;
  texts: StatementTexts;
  failureMessage: string | null;
  noResultsMessage: string | null;
  onRetry: () => void;
  onRetryLoadMore?: () => void;
  onCreatePress: () => void;
  onItemPress?: (id: string) => void;
  className?: string;
};

const CARD =
  'rounded-[14px] bg-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]';
const SKELETON_ROWS = 5;

export function StatementList({
  items,
  status,
  isLoadingMore,
  loadMoreFailed = false,
  texts,
  failureMessage,
  noResultsMessage,
  onRetry,
  onRetryLoadMore,
  onCreatePress,
  onItemPress,
  className,
}: StatementListProps) {
  if (status === 'loading') {
    return <Skeleton label={texts.loading} className={className} />;
  }

  if (status === 'failed') {
    return (
      <View
        role="alert"
        accessibilityLiveRegion="polite"
        className={cn(CARD, 'items-center gap-3 px-6 py-8', className)}
      >
        <Text className="text-center text-[13px] leading-[19.5px] text-label-placeholder">
          {failureMessage}
        </Text>
        <Button
          shape="pill"
          size="sm"
          onPress={onRetry}
          className="h-8 gap-1.5 px-3.5"
        >
          <Icon as={RotateCw} size={14} />
          <Text className="text-xs font-semibold">{texts.retry}</Text>
        </Button>
      </View>
    );
  }

  if (items.length === 0 && noResultsMessage) {
    return (
      <View
        className={cn(
          'rounded-[14px] border border-dashed border-border-primary bg-white px-3.5 py-3',
          className,
        )}
      >
        <Text className="text-[13px] leading-[19.5px] text-label-placeholder">
          {noResultsMessage}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        iconClassName="text-label-quartenery"
        title={texts.empty.title}
        message={texts.empty.description}
        messageClassName="text-[13px] leading-[19.5px] text-label-placeholder"
        action={{
          label: texts.empty.action,
          icon: Plus,
          onPress: onCreatePress,
        }}
        className={cn(CARD, 'gap-2 px-6 py-8', className)}
      />
    );
  }

  return (
    <View className={cn(CARD, 'overflow-hidden', className)}>
      {items.map((item, index) => (
        <StatementRow
          key={item.id}
          item={item}
          automaticLabel={texts.automatic}
          isLast={
            index === items.length - 1 && !isLoadingMore && !loadMoreFailed
          }
          onPress={onItemPress ? () => onItemPress(item.id) : undefined}
        />
      ))}
      {isLoadingMore ? (
        <ActivityIndicator
          accessibilityLabel={texts.loadingMore}
          className="py-3"
        />
      ) : null}
      {loadMoreFailed && !isLoadingMore ? (
        <View role="alert" className="items-center gap-2 px-4 py-3">
          <Text className="text-center text-[13px] leading-[19.5px] text-label-placeholder">
            {texts.loadMoreFailure}
          </Text>
          <Button
            shape="pill"
            size="sm"
            onPress={onRetryLoadMore}
            className="h-8 gap-1.5 px-3.5"
          >
            <Icon as={RotateCw} size={14} />
            <Text className="text-xs font-semibold">{texts.retry}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

type StatementRowProps = {
  item: StatementItem;
  automaticLabel: string;
  isLast: boolean;
  onPress?: () => void;
};

function StatementRow({
  item,
  automaticLabel,
  isLast,
  onPress,
}: StatementRowProps) {
  const content = (
    <View
      className={cn(
        'flex-row items-center gap-3 px-4 py-[13px]',
        !isLast && 'border-b border-details-primary',
      )}
    >
      <View className="size-[34px] items-center justify-center rounded-[10px] bg-details-primary">
        <Icon
          as={item.nature === 'INCOME' ? ArrowUp : ArrowDown}
          size={14}
          className="text-label-primary"
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] font-medium leading-[19.5px] text-label-primary"
          numberOfLines={1}
        >
          {item.description}
        </Text>
        <View className="flex-row items-center gap-1.5 pt-0.5">
          <Text className="text-[11px] leading-[16.5px] text-label-primary">
            {item.date}
          </Text>
          <View className="rounded bg-details-primary px-1.5 py-px">
            <Text
              className="text-[10px] font-semibold leading-[15px] text-label-primary"
              numberOfLines={1}
            >
              {item.category}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row items-center gap-1">
        <View className="items-end">
          <Text className="text-right text-sm font-semibold leading-[21px] text-label-primary">
            {item.amount}
          </Text>
          {item.isAutomatic ? (
            <Text className="text-right text-[10px] leading-[15px] text-label-placeholder">
              {automaticLabel}
            </Text>
          ) : null}
        </View>
        {onPress ? (
          <Icon as={ChevronRight} size={16} className="text-label-primary" />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

function Skeleton({ label, className }: { label: string; className?: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className={cn(CARD, 'overflow-hidden', className)}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View
          key={index}
          className={cn(
            'h-[65.5px] flex-row items-center gap-3 px-4',
            index < SKELETON_ROWS - 1 && 'border-b border-details-primary',
          )}
        >
          <View className="size-[34px] rounded-[10px] bg-details-primary" />
          <View className="flex-1 gap-1.5">
            <View className="h-3 w-[140px] rounded bg-details-primary" />
            <View className="h-2.5 w-[90px] rounded bg-details-primary" />
          </View>
          <View className="h-3 w-14 rounded bg-details-primary" />
        </View>
      ))}
    </View>
  );
}
