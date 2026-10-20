import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { TripListItem, type Trip, type TripMode } from 'features/trips';
import type { Vehicle } from 'features/vehicles';
import { formatCurrency } from 'shared/utils/currency';
import { LabelPlaceholder } from 'theme/colors';

export type TravelSectionTexts = {
  title: string;
  emptyMessage: string;
  register: string;
  collapse: string;
  vehicleLabel: string;
  vehiclePlaceholder: string;
  distanceLabel: string;
  distancePlaceholder: string;
  confirm: string;
};

export type TravelSectionPresentationProps = {
  editable: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  trips: Trip[];
  vehicles: Vehicle[];
  hasNoVehicles: boolean;
  onOpenVehicles?: () => void;
  mode: TripMode;
  onModeChange: (mode: TripMode) => void;
  origin: string;
  onOriginChange: (val: string) => void;
  destination: string;
  onDestinationChange: (val: string) => void;
  selectedVehicleId: string;
  onSelectVehicleId: (id: string) => void;
  distanceKm: string;
  onDistanceKmChange: (val: string) => void;
  cost: string;
  onCostChange: (val: string) => void;
  previewCost: number;
  submitting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onDeleteTrip: (trip: Trip) => void;
  vehicleNamesById: Record<string, string>;
  texts: TravelSectionTexts;
};

export function TravelSectionPresentation({
  editable,
  expanded,
  onToggleExpanded,
  trips,
  vehicles,
  hasNoVehicles,
  onOpenVehicles,
  mode,
  onModeChange,
  origin,
  onOriginChange,
  destination,
  onDestinationChange,
  selectedVehicleId,
  onSelectVehicleId,
  distanceKm,
  onDistanceKmChange,
  cost,
  onCostChange,
  previewCost,
  submitting,
  error,
  onConfirm,
  onDeleteTrip,
  vehicleNamesById,
  texts,
}: TravelSectionPresentationProps) {
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <View className="gap-2">
      {/* Header da Seção */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-label-primary">
          {texts.title}
        </Text>
        {editable ? (
          <Pressable
            onPress={onToggleExpanded}
            accessibilityRole="button"
            accessibilityLabel={expanded ? texts.collapse : texts.register}
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-label-quartenery">
              {expanded ? texts.collapse : texts.register}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Formulário de Adição (Segue a Imagem 1) */}
      {expanded ? (
        <View className="gap-3 rounded-2xl bg-white p-4">
          {/* Modalidade em Chips */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => onModeChange('OWN_VEHICLE')}
              accessibilityRole="button"
              className={
                mode === 'OWN_VEHICLE'
                  ? 'flex-1 items-center rounded-xl bg-button-primary py-2.5'
                  : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-2.5'
              }
            >
              <Text
                className={
                  mode === 'OWN_VEHICLE'
                    ? 'text-xs font-semibold text-label-secondary'
                    : 'text-xs text-label-primary'
                }
              >
                Veículo próprio
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onModeChange('RIDE')}
              accessibilityRole="button"
              className={
                mode === 'RIDE'
                  ? 'flex-1 items-center rounded-xl bg-button-primary py-2.5'
                  : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-2.5'
              }
            >
              <Text
                className={
                  mode === 'RIDE'
                    ? 'text-xs font-semibold text-label-secondary'
                    : 'text-xs text-label-primary'
                }
              >
                Aplicativo / Táxi
              </Text>
            </Pressable>
          </View>

          {/* Veículo Próprio */}
          {mode === 'OWN_VEHICLE' ? (
            <>
              {hasNoVehicles ? (
                <View className="rounded-xl border border-border-primary bg-background-modal p-3">
                  <Text className="text-xs text-label-primary">
                    Você ainda não possui veículos cadastrados.
                  </Text>
                  {onOpenVehicles ? (
                    <Pressable
                      onPress={onOpenVehicles}
                      accessibilityRole="button"
                      className="mt-2"
                    >
                      <Text className="text-xs font-bold text-label-quartenery">
                        + Cadastrar veículo
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold uppercase text-label-primary">
                    {texts.vehicleLabel}
                  </Text>
                  <Pressable
                    onPress={() => setVehiclePickerOpen(open => !open)}
                    accessibilityRole="button"
                    className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3"
                  >
                    <Text
                      style={!selectedVehicle ? { color: LabelPlaceholder } : undefined}
                      className="text-sm text-label-primary"
                    >
                      {selectedVehicle
                        ? `${selectedVehicle.brand} ${selectedVehicle.model} (R$ ${selectedVehicle.costPerKm}/km)`
                        : texts.vehiclePlaceholder}
                    </Text>
                  </Pressable>

                  {vehiclePickerOpen ? (
                    <View className="rounded-xl border border-border-primary bg-white">
                      {vehicles.map((v, index) => (
                        <Pressable
                          key={v.id}
                          onPress={() => {
                            onSelectVehicleId(v.id);
                            setVehiclePickerOpen(false);
                          }}
                          className={
                            index === 0
                              ? 'px-3 py-2.5'
                              : 'border-t border-border-primary px-3 py-2.5'
                          }
                        >
                          <Text className="text-sm text-label-primary">
                            {v.brand} {v.model}{' '}
                            <Text className="text-xs text-label-tertiary">
                              (R$ {v.costPerKm}/km)
                            </Text>
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}

              {/* DISTÂNCIA (KM) */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  {texts.distanceLabel}
                </Text>
                <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
                  <TextInput
                    placeholder={texts.distancePlaceholder}
                    placeholderTextColor={LabelPlaceholder}
                    value={distanceKm}
                    keyboardType="decimal-pad"
                    onChangeText={onDistanceKmChange}
                    className="text-sm text-label-primary"
                  />
                </View>
              </View>
            </>
          ) : (
            /* Modalidade RIDE */
            <>
              <View className="gap-1.5">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  VALOR PAGO (R$)
                </Text>
                <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
                  <TextInput
                    placeholder="Ex: 35.00"
                    placeholderTextColor={LabelPlaceholder}
                    value={cost}
                    keyboardType="decimal-pad"
                    onChangeText={onCostChange}
                    className="text-sm text-label-primary"
                  />
                </View>
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  DISTÂNCIA (KM) (OPCIONAL)
                </Text>
                <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
                  <TextInput
                    placeholder="Ex: 25"
                    placeholderTextColor={LabelPlaceholder}
                    value={distanceKm}
                    keyboardType="decimal-pad"
                    onChangeText={onDistanceKmChange}
                    className="text-sm text-label-primary"
                  />
                </View>
              </View>
            </>
          )}

          {/* Origem e Destino */}
          <View className="gap-2 pt-1">
            <View className="gap-1">
              <Text className="text-xs font-semibold uppercase text-label-primary">
                ORIGEM
              </Text>
              <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
                <TextInput
                  placeholder="Ex: Casa"
                  placeholderTextColor={LabelPlaceholder}
                  value={origin}
                  onChangeText={onOriginChange}
                  className="text-sm text-label-primary"
                />
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-xs font-semibold uppercase text-label-primary">
                DESTINO
              </Text>
              <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
                <TextInput
                  placeholder="Ex: Clínica"
                  placeholderTextColor={LabelPlaceholder}
                  value={destination}
                  onChangeText={onDestinationChange}
                  className="text-sm text-label-primary"
                />
              </View>
            </View>
          </View>

          {/* Custo estimado prévia */}
          <View className="flex-row items-center justify-between border-t border-border-primary pt-2">
            <Text className="text-xs font-semibold text-label-tertiary">
              Custo estimado:
            </Text>
            <Text className="text-sm font-bold text-label-primary">
              {formatCurrency(previewCost, 'pt-BR', { showCents: true })}
            </Text>
          </View>

          {error ? (
            <Text className="text-xs text-alert-primary">{error}</Text>
          ) : null}

          {/* Botão Confirmar (estilo Imagem 1) */}
          <Button
            icon={Check}
            shape="pill"
            className="h-[49px] w-full"
            disabled={submitting}
            onPress={onConfirm}
          >
            <Text className="font-semibold text-label-secondary">
              {submitting ? 'Salvando...' : texts.confirm}
            </Text>
          </Button>
        </View>
      ) : null}

      {/* Lista de deslocamentos já registrados para o atendimento */}
      {trips.length > 0 ? (
        <View className="gap-2">
          {trips.map(trip => (
            <TripListItem
              key={trip.id}
              trip={trip}
              vehicleName={
                trip.vehicleId ? vehicleNamesById[trip.vehicleId] : undefined
              }
              onDelete={editable ? onDeleteTrip : undefined}
            />
          ))}
        </View>
      ) : !expanded ? (
        <View className="rounded-2xl bg-white px-3.5 py-3">
          <Text className="text-[13px]" style={{ color: LabelPlaceholder }}>
            {texts.emptyMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
