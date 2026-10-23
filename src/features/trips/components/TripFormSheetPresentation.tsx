import {
  Calendar,
  Car,
  CarFront,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
import { formatDateInput } from 'shared/utils/inputMasks';
import { LabelPlaceholder } from 'theme/colors';

import type { TripMode } from '../domain/trip.types';
import type { TripFormErrors, TripFormValues } from '../domain/validateTripForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function isoToBr(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso?.trim() ?? '');
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return iso ?? '';
}

function brToIso(br: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br?.trim() ?? '');
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m}-${d}`;
  }
  return br;
}

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
  const [displayDate, setDisplayDate] = useState(() => isoToBr(values.occurredOn));

  useEffect(() => {
    setDisplayDate(isoToBr(values.occurredOn));
  }, [values.occurredOn]);

  const handleDateChange = (raw: string) => {
    const masked = formatDateInput(raw);
    setDisplayDate(masked);
    if (masked.length === 10) {
      onFieldValueChange('occurredOn', brToIso(masked));
    } else {
      onFieldValueChange('occurredOn', masked);
    }
  };

  const clientAutocompleteMessages: ClientAutocompleteMessages = {
    loading: 'Buscando tomador...',
    empty: 'Nenhum tomador encontrado',
    error: 'Erro ao buscar tomador',
  };

  const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);
  const vehicleCostPerKmFormatted = selectedVehicle
    ? formatCurrency(
        typeof selectedVehicle.costPerKm === 'string'
          ? parseFloat(selectedVehicle.costPerKm) || 0
          : selectedVehicle.costPerKm,
        'pt-BR',
        { showCents: true },
      )
    : null;

  const hasVehicleAndDistance = Boolean(
    selectedVehicle && values.distanceKm && parseFloat(values.distanceKm) > 0,
  );
  const hasRideCost = Boolean(values.cost && parseFloat(values.cost) > 0);

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        {/* Overlay escuro semitransparente que cobre a tela inteira por trás */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: sheet.progress }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            className="flex-1"
            style={styles.backdropPressable}
          />
        </Animated.View>

        {/* Sheet deslizante ocupando ~90% da tela, cobrindo o cabeçalho */}
        <Animated.View
          {...sheet.panHandlers}
          style={[
            {
              height: SCREEN_HEIGHT * 0.9,
              maxHeight: SCREEN_HEIGHT * 0.92,
            },
            sheet.sheetStyle,
          ]}
        >
          <View className="flex-1 rounded-t-[32px] bg-background-modal px-5 pt-3">
            {/* Alça no Topo */}
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-[#D8D3CC]" />

            {/* Título (sem linha divisória) */}
            <Text className="mb-3 text-xl font-bold text-label-primary">
              {title}
            </Text>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-3.5 pb-10"
            >
              {/* COMO FOI */}
              <View>
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                  COMO FOI
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => onModeChange('OWN_VEHICLE')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mode === 'OWN_VEHICLE' }}
                    className={
                      mode === 'OWN_VEHICLE'
                        ? 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-button-primary'
                        : 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border-primary bg-white'
                    }
                  >
                    <Icon
                      as={Car}
                      size={18}
                      className={
                        mode === 'OWN_VEHICLE'
                          ? 'text-label-secondary'
                          : 'text-label-quartenery'
                      }
                    />
                    <Text
                      className={
                        mode === 'OWN_VEHICLE'
                          ? 'font-medium text-label-secondary'
                          : 'font-medium text-label-primary'
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
                        ? 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-button-primary'
                        : 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border-primary bg-white'
                    }
                  >
                    <Icon
                      as={CarFront}
                      size={18}
                      className={
                        mode === 'RIDE'
                          ? 'text-label-secondary'
                          : 'text-label-quartenery'
                      }
                    />
                    <Text
                      className={
                        mode === 'RIDE'
                          ? 'font-medium text-label-secondary'
                          : 'font-medium text-label-primary'
                      }
                    >
                      Aplicativo/táxi
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ORIGEM */}
              <View>
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                  ORIGEM
                </Text>
                <TextInput
                  placeholder="Ex: Casa"
                  placeholderTextColor={LabelPlaceholder}
                  value={values.origin}
                  maxLength={100}
                  onChangeText={v => onFieldValueChange('origin', v)}
                  className="h-12 rounded-2xl border border-border-primary bg-white px-4 text-[15px] text-label-primary"
                />
                {errors.origin ? (
                  <Text className="mt-1 text-xs text-alert-primary">
                    Informe a origem
                  </Text>
                ) : null}
              </View>

              {/* DESTINO */}
              <View>
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                  DESTINO
                </Text>
                <TextInput
                  placeholder="Ex: Clínica VetNova"
                  placeholderTextColor={LabelPlaceholder}
                  value={values.destination}
                  maxLength={100}
                  onChangeText={v => onFieldValueChange('destination', v)}
                  className="h-12 rounded-2xl border border-border-primary bg-white px-4 text-[15px] text-label-primary"
                />
                {errors.destination ? (
                  <Text className="mt-1 text-xs text-alert-primary">
                    Informe o destino
                  </Text>
                ) : null}
              </View>

              {/* VEÍCULO (quando Veículo Próprio) ou VALOR PAGO (quando Aplicativo) */}
              {mode === 'OWN_VEHICLE' ? (
                <View>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                    VEÍCULO
                  </Text>
                  {isLoadingVehicles ? (
                    <ActivityIndicator size="small" />
                  ) : vehicles.length === 0 ? (
                    <View className="rounded-2xl border border-border-primary bg-white p-3.5">
                      <Text className="text-sm text-alert-primary">
                        Nenhum veículo ativo cadastrado. Cadastre um veículo primeiro.
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Pressable
                        onPress={() => setVehicleDropdownOpen(open => !open)}
                        accessibilityRole="button"
                        className="h-12 flex-row items-center justify-between rounded-2xl border border-border-primary bg-white px-4"
                      >
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-[15px] text-label-primary"
                          style={!selectedVehicle ? { color: LabelPlaceholder } : undefined}
                        >
                          {selectedVehicle
                            ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${vehicleCostPerKmFormatted}/km`
                            : 'Selecione um veículo'}
                        </Text>
                        <Icon as={ChevronDown} size={18} className="ml-2 text-label-tertiary" />
                      </Pressable>

                      {vehicleDropdownOpen ? (
                        <View className="mt-1 overflow-hidden rounded-2xl border border-border-primary bg-white">
                          {vehicles.map((v, index) => {
                            const costFormatted = formatCurrency(
                              typeof v.costPerKm === 'string'
                                ? parseFloat(v.costPerKm) || 0
                                : v.costPerKm,
                              'pt-BR',
                              { showCents: true },
                            );
                            return (
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
                                <Text className="text-sm font-medium text-label-primary">
                                  {v.brand} {v.model}{' '}
                                  <Text className="text-xs text-label-tertiary">
                                    · {costFormatted}/km
                                  </Text>
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  )}
                  {errors.vehicleId ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      Selecione um veículo
                    </Text>
                  ) : null}
                </View>
              ) : (
                /* VALOR PAGO (R$) para RIDE */
                <View>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                    VALOR PAGO (R$)
                  </Text>
                  <TextInput
                    placeholder="Ex: 32,90"
                    placeholderTextColor={LabelPlaceholder}
                    value={values.cost}
                    keyboardType="decimal-pad"
                    onChangeText={v => onFieldValueChange('cost', v)}
                    className="h-12 rounded-2xl border border-border-primary bg-white px-4 text-[15px] text-label-primary"
                  />
                  {errors.cost ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      Informe o valor pago maior que zero
                    </Text>
                  ) : null}
                </View>
              )}

              {/* DISTÂNCIA (KM) e DATA lado a lado */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                    {mode === 'RIDE' ? 'DISTÂNCIA (KM) (OPCIONAL)' : 'DISTÂNCIA (KM)'}
                  </Text>
                  <TextInput
                    placeholder="Ex: 30"
                    placeholderTextColor={LabelPlaceholder}
                    value={values.distanceKm}
                    keyboardType="decimal-pad"
                    onChangeText={v => onFieldValueChange('distanceKm', v)}
                    className="h-12 rounded-2xl border border-border-primary bg-white px-4 text-[15px] text-label-primary"
                  />
                  {errors.distanceKm ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      Distância inválida
                    </Text>
                  ) : null}
                </View>

                <View className="flex-1">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                    DATA
                  </Text>
                  <View className="h-12 flex-row items-center justify-between rounded-2xl border border-border-primary bg-white px-4">
                    <TextInput
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={LabelPlaceholder}
                      value={displayDate}
                      keyboardType="number-pad"
                      maxLength={10}
                      onChangeText={handleDateChange}
                      className="flex-1 text-[15px] text-label-primary"
                    />
                    <Icon as={Calendar} size={18} className="ml-1 text-label-tertiary" />
                  </View>
                  {errors.occurredOn ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      {errors.occurredOn === 'occurredOnRequired'
                        ? 'Informe a data'
                        : 'Data inválida'}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Caixa de Prévia: Custo do deslocamento com tom neutro #F4F1EA */}
              <View className="flex-row items-center justify-between rounded-2xl border border-border-primary/20 bg-[#F4F1EA] p-3.5">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-semibold text-label-primary">
                    Custo do deslocamento
                  </Text>
                  {mode === 'OWN_VEHICLE' ? (
                    hasVehicleAndDistance ? (
                      <Text className="mt-0.5 text-xs text-label-tertiary">
                        {values.distanceKm} km × {vehicleCostPerKmFormatted}/km
                      </Text>
                    ) : (
                      <Text className="mt-0.5 text-xs text-label-tertiary">
                        Selecione o veículo e a distância
                      </Text>
                    )
                  ) : (
                    hasRideCost ? (
                      <Text className="mt-0.5 text-xs text-label-tertiary">
                        Valor informado
                      </Text>
                    ) : (
                      <Text className="mt-0.5 text-xs text-label-tertiary">
                        Informe o valor pago
                      </Text>
                    )
                  )}
                </View>
                <Text className="text-lg font-bold text-label-primary">
                  {formatCurrency(previewCost, 'pt-BR', { showCents: true })}
                </Text>
              </View>

              {/* TOMADOR (OPCIONAL) com seletor e ChevronDown */}
              <View>
                <ClientAutocomplete
                  label="TOMADOR (OPCIONAL)"
                  placeholder="Selecione o tomador"
                  trailingIcon={ChevronDown}
                  value={clientSearchTerm}
                  status={clientSearchStatus}
                  options={clientSearchOptions}
                  messages={clientAutocompleteMessages}
                  onChangeText={onClientSearchTermChange}
                  onSelect={onSelectClient}
                />
              </View>

              {errors.general ? (
                <Text className="text-sm text-alert-primary">
                  {errors.general}
                </Text>
              ) : null}

              {/* Botão Salvar dentro do conteúdo rolável (largura total, marrom escuro, pílula com ícone check) */}
              <View className="mt-2 gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Salvar"
                  disabled={submitting}
                  onPress={onSubmit}
                  className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-button-primary active:opacity-90"
                >
                  <Icon as={Check} size={18} className="text-label-secondary" />
                  <Text className="text-base font-semibold text-label-secondary">
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </Text>
                </Pressable>

                {isEditing && onDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Excluir deslocamento"
                    disabled={submitting}
                    onPress={onDelete}
                    className="h-12 w-full flex-row items-center justify-center gap-2 rounded-full border border-alert-primary bg-white active:opacity-80"
                  >
                    <Icon as={Trash2} size={16} className="text-alert-primary" />
                    <Text className="text-sm font-semibold text-alert-primary">
                      Excluir deslocamento
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropPressable: {
    backgroundColor: 'rgba(50, 48, 48, 0.5)',
  },
});
