import { ArrowLeft, CarFront, Plus } from 'lucide-react-native';
import React from 'react';
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
  clientNamesById?: Record<string, string>;
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
  clientNamesById = {},
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
            contentSize.height - 200;
          if (isCloseToBottom && hasMore && !isLoadingMore) {
            onLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Botão de Voltar Redondo e Escuro */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          onPress={onBack}
          className="size-10 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>

        {/* Título e Subtítulo */}
        <View className="mb-4 mt-3">
          <Text className="text-2xl font-bold text-label-primary">
            Deslocamentos
          </Text>
          <Text className="mt-1 text-sm text-label-tertiary">
            Quanto você rodou e gastou para atender
          </Text>
        </View>

        {/* Card de Resumo com Seletor de Mês e Métricas */}
        <TripsSummaryCard
          monthLabel={monthLabel}
          isCurrentMonth={isCurrentMonth}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          totalKm={totalKm}
          totalCost={totalCost}
          tripsCount={totalTripsCount}
        />

        {/* Lista de Deslocamentos ou Estado Vazio (sem botão interno) */}
        {groupedTrips.length === 0 && !isLoading ? (
          <View className="mt-4">
            <EmptyState
              icon={CarFront}
              title="Nenhum deslocamento no período"
              message="Registre seus deslocamentos para acompanhar a quilometragem e o custo de transporte."
            />
          </View>
        ) : (
          <View className="mt-2">
            {groupedTrips.map(group => (
              <View key={group.date} className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-label-primary">
                  {group.formattedDate}
                </Text>

                <View className="overflow-hidden rounded-2xl border border-[#F0ECE4] bg-white">
                  {group.trips.map((trip, idx) => (
                    <View
                      key={trip.id}
                      className={idx > 0 ? 'border-t border-[#F0ECE4]' : ''}
                    >
                      <TripListItem
                        trip={trip}
                        vehicleName={
                          trip.vehicleId
                            ? vehicleNamesById[trip.vehicleId]
                            : undefined
                        }
                        clientName={
                          trip.clientId ? clientNamesById[trip.clientId] : undefined
                        }
                        onPress={onTripPress}
                        onDelete={onDeleteTrip}
                        showChevron
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

      {/* Botão Flutuante no Rodapé (sem faixa branca e sem linha separadora) */}
      <View
        pointerEvents="box-none"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        className="absolute bottom-0 left-0 right-0 px-4"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar deslocamento"
          onPress={onAddTrip}
          className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-button-primary shadow-lg shadow-black/20 active:opacity-90"
        >
          <Icon as={Plus} size={20} className="text-label-secondary" />
          <Text className="text-base font-semibold text-label-secondary">
            Registrar deslocamento
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
