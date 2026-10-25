import { ArrowLeft, CarFront, Plus } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { TripListItem, type TripListItemTexts } from './TripListItem';
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
  emptyTitle: string;
  emptyMessage: string;
  summary: TripsSummaryTexts;
};

export type TripsScreenPresentationProps = {
  texts: TripsScreenTexts;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  groups: TripRowGroup[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onTripPress: (trip: Trip) => void;
  onAddTrip: () => void;
  onBack: () => void;
};

export function TripsScreenPresentation({
  texts,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  groups,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  onTripPress,
  onAddTrip,
  onBack,
}: TripsScreenPresentationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background-modal">
      <ScrollView
        contentContainerClassName="p-4 pb-28"
        style={{ paddingTop: Math.max(insets.top, 16) }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.back}
          hitSlop={8}
          onPress={onBack}
          className="size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="mb-4 mt-3">
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold text-label-primary"
          >
            {texts.title}
          </Text>
          <Text className="mt-1 text-sm text-label-tertiary">
            {texts.subtitle}
          </Text>
        </View>

        <TripsSummaryCard
          texts={texts.summary}
          isCurrentMonth={isCurrentMonth}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
        />

        {groups.length === 0 && !isLoading ? (
          <View className="mt-4">
            <EmptyState
              icon={CarFront}
              title={texts.emptyTitle}
              message={texts.emptyMessage}
            />
          </View>
        ) : (
          <View className="mt-2">
            {groups.map(group => (
              <View key={group.date} className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-label-primary">
                  {group.label}
                </Text>

                <View className="overflow-hidden rounded-2xl border border-border-primary bg-white">
                  {group.rows.map((row, index) => (
                    <View
                      key={row.trip.id}
                      className={
                        index > 0 ? 'border-t border-border-primary' : ''
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
          </View>
        )}
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        className="absolute bottom-0 left-0 right-0 px-4"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.add}
          onPress={onAddTrip}
          className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-button-primary shadow-lg shadow-black/20 active:opacity-90"
        >
          <Icon as={Plus} size={20} className="text-label-secondary" />
          <Text className="text-base font-semibold text-label-secondary">
            {texts.add}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
