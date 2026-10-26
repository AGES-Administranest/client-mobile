import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, RotateCw, Route } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { BackgroundPrimary } from 'theme/colors';

import { TripListItem, type TripListItemTexts } from './TripListItem';
import { TripsListSkeleton } from './TripsListSkeleton';
import { TripsSummaryCard, type TripsSummaryTexts } from './TripsSummaryCard';
import type { Trip } from '../domain/trip.types';

const LOAD_MORE_THRESHOLD_PX = 200;

export type TripRow = {
  trip: Trip;
  texts: TripListItemTexts;
};

export type TripRowGroup = {
  date: string;
  label: string;
  rows: TripRow[];
};

export type TripsScreenTexts = {
  title: string;
  subtitle: string;
  back: string;
  add: string;
  loading: string;
  emptyTitle: string;
  emptyMessage: string;
  loadFailed: string;
  retry: string;
  summary: TripsSummaryTexts;
};

export type TripsScreenPresentationProps = {
  texts: TripsScreenTexts;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  groups: TripRowGroup[];
  isLoading: boolean;
  hasError: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onTripPress: (trip: Trip) => void;
  onAddTrip: () => void;
  onBack: () => void;
};

const styles = StyleSheet.create({ fill: { flex: 1 } });

// A message and one pill, in the card the Figma uses for a list that could
// not be read.
function LoadFailedCard({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center gap-3 rounded-[14px] bg-white px-6 py-8 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
      <Text className="text-center text-[13px] leading-[19.5px] text-label-placeholder">
        {message}
      </Text>
      <Button
        shape="pill"
        size="sm"
        className="h-8 gap-1.5 px-3.5"
        onPress={onRetry}
      >
        <Icon as={RotateCw} size={14} />
        <Text className="text-xs font-semibold">{retryLabel}</Text>
      </Button>
    </View>
  );
}

export function TripsScreenPresentation({
  texts,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  groups,
  isLoading,
  hasError,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  onTripPress,
  onAddTrip,
  onBack,
}: TripsScreenPresentationProps) {
  const insets = useSafeAreaInsets();

  const hasTrips = groups.length > 0;
  const isInitialLoading = isLoading && !hasTrips;
  const failedToLoad = hasError && !isLoading && !hasTrips;
  const isEmpty = !isLoading && !hasError && !hasTrips;
  const summaryStatus = isInitialLoading
    ? 'loading'
    : failedToLoad
    ? 'error'
    : 'ready';

  return (
    <View style={[styles.fill, { paddingTop: Math.max(insets.top, 16) }]}>
      <LinearGradient
        colors={BackgroundPrimary.colors}
        locations={BackgroundPrimary.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="gap-3 px-[15px] pb-2 pt-0">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.back}
          hitSlop={8}
          onPress={onBack}
          className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="px-[7px]">
          <Text
            accessibilityRole="header"
            className="text-xl font-bold leading-[30px] tracking-[-0.2px] text-label-primary"
          >
            {texts.title}
          </Text>
          <Text className="text-[13px] leading-[19.5px] text-label-primary">
            {texts.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-[18px] px-[22px] pb-28 pt-2.5"
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasTrips}
            onRefresh={onRefresh}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - LOAD_MORE_THRESHOLD_PX;
          if (isCloseToBottom && hasMore && !isLoadingMore) {
            onLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <TripsSummaryCard
          texts={texts.summary}
          status={summaryStatus}
          isCurrentMonth={isCurrentMonth}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
        />

        {isInitialLoading ? <TripsListSkeleton label={texts.loading} /> : null}

        {failedToLoad ? (
          <LoadFailedCard
            message={texts.loadFailed}
            retryLabel={texts.retry}
            onRetry={onRefresh}
          />
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon={Route}
            title={texts.emptyTitle}
            message={texts.emptyMessage}
            titleClassName="text-base leading-6 text-label-quartenery"
            messageClassName="text-[13px] leading-[19.5px]"
            action={{ label: texts.add, icon: Plus, onPress: onAddTrip }}
            className="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]"
          />
        ) : null}

        {groups.map(group => (
          <View key={group.date} className="gap-2">
            <Text className="px-1 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-primary">
              {group.label}
            </Text>

            <View className="overflow-hidden rounded-[14px] bg-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
              {group.rows.map((row, index) => (
                <View
                  key={row.trip.id}
                  className={
                    index > 0 ? 'border-t border-details-primary' : undefined
                  }
                >
                  <TripListItem
                    trip={row.trip}
                    texts={row.texts}
                    onPress={onTripPress}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {isLoadingMore ? (
          <ActivityIndicator size="small" className="py-4" />
        ) : null}
      </ScrollView>

      {isEmpty ? null : (
        <View
          pointerEvents="box-none"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          className="absolute bottom-0 left-0 right-0 px-[22px]"
        >
          <Button
            shape="pill"
            icon={Plus}
            accessibilityLabel={texts.add}
            className="h-[49px] w-full"
            onPress={onAddTrip}
          >
            <Text>{texts.add}</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
