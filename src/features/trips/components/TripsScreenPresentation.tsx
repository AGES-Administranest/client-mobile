// LAYOUT PROVISÓRIO: aguardando imagem de referência
import {
  ArrowLeft,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { TripListItem } from './TripListItem';
import { TripsSummaryCard } from './TripsSummaryCard';
import type { Trip } from '../domain/trip.types';
import type { TripGroup } from '../hooks/useTrips';

export type TripsScreenPresentationProps = {
  monthLabel: string;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  totalKm: string;
  totalCost: string;
  groupedTrips: TripGroup[];
  totalTripsCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onTripPress: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
  onAddTrip: () => void;
  onBack: () => void;
  vehicleNamesById: Record<string, string>;
};

export function TripsScreenPresentation({
  monthLabel,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  totalKm,
  totalCost,
  groupedTrips,
  totalTripsCount,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  onTripPress,
  onDeleteTrip,
  onAddTrip,
  onBack,
  vehicleNamesById,
}: TripsScreenPresentationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background-modal">
      {/* Top Header */}
      <View
        style={{ paddingTop: Math.max(insets.top, 16) }}
        className="flex-row items-center justify-between border-b border-border-primary bg-white px-4 pb-3"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
            onPress={onBack}
            className="size-9 items-center justify-center rounded-full bg-details-primary active:opacity-70"
          >
            <Icon as={ArrowLeft} size={20} className="text-label-primary" />
          </Pressable>
          <Text className="text-xl font-bold text-label-primary">
            Deslocamentos
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar deslocamento"
          hitSlop={8}
          onPress={onAddTrip}
          className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={Plus} size={20} className="text-label-secondary" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-12"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 200;
          if (isCloseToBottom && hasMore && !isLoadingMore) {
            onLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Seletor de Mês (estilo Finanças) */}
        <Card className="gap-0 rounded-[14px] bg-white p-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              onPress={onPreviousMonth}
              className="size-8 items-center justify-center rounded-full bg-button-primary active:opacity-80"
            >
              <Icon
                as={ChevronLeft}
                size={16}
                className="text-label-secondary"
              />
            </Pressable>

            <View className="items-center">
              <Text className="text-sm font-semibold capitalize text-label-primary">
                {monthLabel}
              </Text>
              {isCurrentMonth ? (
                <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-label-tertiary">
                  Mês atual
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              onPress={onNextMonth}
              className="size-8 items-center justify-center rounded-full bg-button-primary active:opacity-80"
            >
              <Icon
                as={ChevronRight}
                size={16}
                className="text-label-secondary"
              />
            </Pressable>
          </View>
        </Card>

        {/* Card de Resumo */}
        <TripsSummaryCard
          totalKm={totalKm}
          totalCost={totalCost}
          tripsCount={totalTripsCount}
        />

        {/* Lista de Deslocamentos agrupados por data */}
        {groupedTrips.length === 0 && !isLoading ? (
          <EmptyState
            icon={CarFront}
            title="Nenhum deslocamento no período"
            message="Registre seus deslocamentos para acompanhar a quilometragem e o custo de transporte."
            action={{
              label: 'Registrar deslocamento',
              icon: Plus,
              onPress: onAddTrip,
            }}
          />
        ) : (
          <View className="gap-4">
            {groupedTrips.map(group => (
              <View key={group.date} className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-label-tertiary">
                  {group.formattedDate}
                </Text>

                <View className="gap-2">
                  {group.trips.map(trip => (
                    <TripListItem
                      key={trip.id}
                      trip={trip}
                      vehicleName={
                        trip.vehicleId
                          ? vehicleNamesById[trip.vehicleId]
                          : undefined
                      }
                      onPress={onTripPress}
                      onDelete={onDeleteTrip}
                    />
                  ))}
                </View>
              </View>
            ))}

            {isLoadingMore ? (
              <ActivityIndicator size="small" className="py-2" />
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
