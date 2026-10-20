// LAYOUT PROVISÓRIO: aguardando imagem de referência
import { Check, Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';
import type { Vehicle } from 'features/vehicles';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { formatCurrency } from 'shared/utils/currency';
import { LabelPlaceholder } from 'theme/colors';

import type { TripMode } from '../domain/trip.types';
import type { TripFormErrors, TripFormValues } from '../domain/validateTripForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type TripFormSheetPresentationProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  isEditing: boolean;
  values: TripFormValues;
  errors: TripFormErrors;
  mode: TripMode;
  onModeChange: (mode: TripMode) => void;
  onFieldValueChange: <K extends keyof TripFormValues>(
    field: K,
    value: TripFormValues[K],
  ) => void;
  previewCost: number;
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  clientSearchTerm: string;
  clientSearchStatus: ClientSearchStatus;
  clientSearchOptions: ClientOption[];
  onClientSearchTermChange: (term: string) => void;
  onSelectClient: (option: ClientOption) => void;
  submitting: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
};

export function TripFormSheetPresentation({
  visible,
  onClose,
  title,
  isEditing,
  values,
  errors,
  mode,
  onModeChange,
  onFieldValueChange,
  previewCost,
  vehicles,
  isLoadingVehicles,
  clientSearchTerm,
  clientSearchStatus,
  clientSearchOptions,
  onClientSearchTermChange,
  onSelectClient,
  submitting,
  onSubmit,
  onDelete,
}: TripFormSheetPresentationProps) {
  const sheet = useSheetAnimation(visible, onClose);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  const clientAutocompleteMessages: ClientAutocompleteMessages = {
    loading: 'Buscando tomador...',
    empty: 'Nenhum tomador encontrado',
    error: 'Erro ao buscar tomador',
  };

  const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.backdrop, { opacity: sheet.progress }]}
        className="justify-end bg-background-shade"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          className="flex-1"
        />

        <Animated.View
          {...sheet.panHandlers}
          style={{
            maxHeight: SCREEN_HEIGHT * 0.92,
            ...sheet.sheetStyle,
          }}
        >
          <View className="shrink gap-3 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-label-primary">
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={8}
                onPress={onClose}
              >
                <Icon as={X} size={20} className="text-label-tertiary" />
              </Pressable>
            </View>

            <View className="h-px bg-details-primary" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-3 pb-2"
            >
              {/* Modalidade (Chips) */}
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  Modalidade
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => onModeChange('OWN_VEHICLE')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mode === 'OWN_VEHICLE' }}
                    className={
                      mode === 'OWN_VEHICLE'
                        ? 'flex-1 items-center rounded-xl bg-button-primary py-3'
                        : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-3'
                    }
                  >
                    <Text
                      className={
                        mode === 'OWN_VEHICLE'
                          ? 'font-semibold text-label-secondary'
                          : 'text-label-primary'
                      }
                    >
                      Veículo próprio
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onModeChange('RIDE')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mode === 'RIDE' }}
                    className={
                      mode === 'RIDE'
                        ? 'flex-1 items-center rounded-xl bg-button-primary py-3'
                        : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-3'
                    }
                  >
                    <Text
                      className={
                        mode === 'RIDE'
                          ? 'font-semibold text-label-secondary'
                          : 'text-label-primary'
                      }
                    >
                      Aplicativo / Táxi
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Data (occurredOn) */}
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  Data
                </Text>
                <TextInput
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={LabelPlaceholder}
                  value={values.occurredOn}
                  onChangeText={v => onFieldValueChange('occurredOn', v)}
                  className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                />
                {errors.occurredOn ? (
                  <Text className="text-xs text-alert-primary">
                    {errors.occurredOn === 'occurredOnRequired'
                      ? 'Informe a data'
                      : 'Data inválida (use o formato AAAA-MM-DD)'}
                  </Text>
                ) : null}
              </View>

              {/* Origem */}
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  Origem
                </Text>
                <TextInput
                  placeholder="Ex: Casa"
                  placeholderTextColor={LabelPlaceholder}
                  value={values.origin}
                  maxLength={200}
                  onChangeText={v => onFieldValueChange('origin', v)}
                  className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                />
                {errors.origin ? (
                  <Text className="text-xs text-alert-primary">
                    Informe a origem
                  </Text>
                ) : null}
              </View>

              {/* Destino */}
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  Destino
                </Text>
                <TextInput
                  placeholder="Ex: Clínica Veterinária São Francisco"
                  placeholderTextColor={LabelPlaceholder}
                  value={values.destination}
                  maxLength={200}
                  onChangeText={v => onFieldValueChange('destination', v)}
                  className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                />
                {errors.destination ? (
                  <Text className="text-xs text-alert-primary">
                    Informe o destino
                  </Text>
                ) : null}
              </View>

              {/* Veículo Próprio Fields */}
              {mode === 'OWN_VEHICLE' ? (
                <>
                  <View className="gap-1">
                    <Text className="text-xs font-semibold uppercase text-label-primary">
                      Veículo
                    </Text>
                    {isLoadingVehicles ? (
                      <ActivityIndicator size="small" />
                    ) : vehicles.length === 0 ? (
                      <View className="rounded-xl border border-border-primary bg-white p-3">
                        <Text className="text-sm text-alert-primary">
                          Nenhum veículo ativo cadastrado. Cadastre um veículo primeiro.
                        </Text>
                      </View>
                    ) : (
                      <View className="gap-1">
                        <Pressable
                          onPress={() => setVehicleDropdownOpen(open => !open)}
                          accessibilityRole="button"
                          className="rounded-xl border border-border-primary bg-white px-4 py-3"
                        >
                          <Text
                            className="text-[15px] text-label-primary"
                            style={!selectedVehicle ? { color: LabelPlaceholder } : undefined}
                          >
                            {selectedVehicle
                              ? `${selectedVehicle.brand} ${selectedVehicle.model} (R$ ${selectedVehicle.costPerKm}/km)`
                              : 'Selecione um veículo'}
                          </Text>
                        </Pressable>

                        {vehicleDropdownOpen ? (
                          <View className="rounded-xl border border-border-primary bg-white">
                            {vehicles.map((v, index) => (
                              <Pressable
                                key={v.id}
                                onPress={() => {
                                  onFieldValueChange('vehicleId', v.id);
                                  setVehicleDropdownOpen(false);
                                }}
                                className={
                                  index === 0
                                    ? 'px-4 py-3'
                                    : 'border-t border-border-primary px-4 py-3'
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
                    {errors.vehicleId ? (
                      <Text className="text-xs text-alert-primary">
                        Selecione um veículo
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-1">
                    <Text className="text-xs font-semibold uppercase text-label-primary">
                      Distância (km)
                    </Text>
                    <TextInput
                      placeholder="Ex: 30"
                      placeholderTextColor={LabelPlaceholder}
                      value={values.distanceKm}
                      keyboardType="decimal-pad"
                      onChangeText={v => onFieldValueChange('distanceKm', v)}
                      className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                    />
                    {errors.distanceKm ? (
                      <Text className="text-xs text-alert-primary">
                        Informe uma distância válida maior que zero
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                /* RIDE (App / Táxi) Fields */
                <>
                  <View className="gap-1">
                    <Text className="text-xs font-semibold uppercase text-label-primary">
                      Valor pago (R$)
                    </Text>
                    <TextInput
                      placeholder="Ex: 35.00"
                      placeholderTextColor={LabelPlaceholder}
                      value={values.cost}
                      keyboardType="decimal-pad"
                      onChangeText={v => onFieldValueChange('cost', v)}
                      className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                    />
                    {errors.cost ? (
                      <Text className="text-xs text-alert-primary">
                        Informe o valor pago maior que zero
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-1">
                    <Text className="text-xs font-semibold uppercase text-label-primary">
                      Distância (km) (opcional)
                    </Text>
                    <TextInput
                      placeholder="Ex: 25"
                      placeholderTextColor={LabelPlaceholder}
                      value={values.distanceKm}
                      keyboardType="decimal-pad"
                      onChangeText={v => onFieldValueChange('distanceKm', v)}
                      className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
                    />
                    {errors.distanceKm ? (
                      <Text className="text-xs text-alert-primary">
                        Distância inválida
                      </Text>
                    ) : null}
                  </View>
                </>
              )}

              {/* Tomador de serviço (ClientAutocomplete) */}
              <View className="gap-1">
                <ClientAutocomplete
                  label="Tomador de serviço (opcional)"
                  placeholder="Buscar cliente ou clínica..."
                  value={clientSearchTerm}
                  status={clientSearchStatus}
                  options={clientSearchOptions}
                  messages={clientAutocompleteMessages}
                  onChangeText={onClientSearchTermChange}
                  onSelect={onSelectClient}
                />
              </View>

              {/* Prévia do Custo */}
              <View className="mt-1 flex-row items-center justify-between rounded-xl bg-white p-3">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  Custo estimado
                </Text>
                <Text className="text-base font-bold text-label-primary">
                  {formatCurrency(previewCost, 'pt-BR', { showCents: true })}
                </Text>
              </View>

              {errors.general ? (
                <Text className="text-sm text-alert-primary">
                  {errors.general}
                </Text>
              ) : null}
            </ScrollView>

            {/* Ações */}
            <View className="gap-2 pt-2">
              <Button
                shape="pill"
                icon={Check}
                className="h-[49px] w-full"
                disabled={submitting}
                onPress={onSubmit}
              >
                <Text className="font-semibold text-label-secondary">
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </Text>
              </Button>

              {isEditing && onDelete ? (
                <Button
                  shape="pill"
                  variant="secondary"
                  icon={Trash2}
                  className="h-[49px] w-full"
                  disabled={submitting}
                  onPress={onDelete}
                >
                  <Text className="font-semibold text-label-secondary">
                    Excluir deslocamento
                  </Text>
                </Button>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
});
