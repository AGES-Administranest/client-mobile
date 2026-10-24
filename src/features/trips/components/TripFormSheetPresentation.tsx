import {
  Calendar,
  Car,
  CarFront,
  Check,
  ChevronDown,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { formatDateInput } from 'shared/utils/inputMasks';
import { LabelPlaceholder } from 'theme/colors';

import type { TripMode } from '../domain/trip.types';
import { displayDateToIso, isoToDisplayDate } from '../domain/tripFormat';
import type {
  TripFormErrors,
  TripFormValues,
} from '../domain/validateTripForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const FIELD_LABEL =
  'mb-1.5 text-[11px] font-bold uppercase tracking-wider text-label-primary';
const FIELD_INPUT =
  'h-12 rounded-2xl border border-border-primary bg-white px-4 text-[15px] text-label-primary';
const FIELD_ERROR = 'mt-1 text-xs text-alert-primary';

export type TripFormTexts = {
  title: string;
  close: string;
  modeLabel: string;
  ownVehicle: string;
  ride: string;
  origin: string;
  originPlaceholder: string;
  destination: string;
  destinationPlaceholder: string;
  vehicle: string;
  vehiclePlaceholder: string;
  noVehicles: string;
  cost: string;
  costPlaceholder: string;
  distance: string;
  distanceOptional: string;
  distancePlaceholder: string;
  date: string;
  datePlaceholder: string;
  previewTitle: string;
  previewFormula: string | null;
  previewPickVehicle: string;
  previewInformed: string;
  previewInformCost: string;
  previewCost: string;
  client: string;
  clientPlaceholder: string;
  clientMessages: ClientAutocompleteMessages;
  save: string;
  saving: string;
  delete: string;
  errors: Partial<Record<keyof TripFormErrors, string>>;
};

export type TripVehicleOption = {
  id: string;
  label: string;
};

export type TripFormSheetPresentationProps = {
  visible: boolean;
  onClose: () => void;
  texts: TripFormTexts;
  isEditing: boolean;
  values: TripFormValues;
  errors: TripFormErrors;
  mode: TripMode;
  onModeChange: (mode: TripMode) => void;
  onFieldValueChange: <K extends keyof TripFormValues>(
    field: K,
    value: TripFormValues[K],
  ) => void;
  vehicleOptions: TripVehicleOption[];
  selectedVehicleLabel: string | null;
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

type ModeButtonProps = {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
};

function ModeButton({ label, icon, selected, onPress }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-button-primary'
          : 'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border-primary bg-white'
      }
    >
      <Icon
        as={icon}
        size={18}
        className={selected ? 'text-label-secondary' : 'text-label-quartenery'}
      />
      <Text
        className={
          selected
            ? 'font-medium text-label-secondary'
            : 'font-medium text-label-primary'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TripFormSheetPresentation({
  visible,
  onClose,
  texts,
  isEditing,
  values,
  errors,
  mode,
  onModeChange,
  onFieldValueChange,
  vehicleOptions,
  selectedVehicleLabel,
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
  const [displayDate, setDisplayDate] = useState(() =>
    isoToDisplayDate(values.occurredOn),
  );

  useEffect(() => {
    setDisplayDate(isoToDisplayDate(values.occurredOn));
  }, [values.occurredOn]);

  useEffect(() => {
    if (!visible) setVehicleDropdownOpen(false);
  }, [visible]);

  const handleDateChange = (raw: string) => {
    const masked = formatDateInput(raw);
    setDisplayDate(masked);
    onFieldValueChange(
      'occurredOn',
      masked.length === 10 ? displayDateToIso(masked) : masked,
    );
  };

  const previewSubtitle =
    mode === 'OWN_VEHICLE'
      ? texts.previewFormula ?? texts.previewPickVehicle
      : values.cost.trim()
      ? texts.previewInformed
      : texts.previewInformCost;

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
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: sheet.progress }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.close}
            onPress={onClose}
            className="flex-1 bg-background-shade"
          />
        </Animated.View>

        <Animated.View
          {...sheet.panHandlers}
          style={[styles.sheet, sheet.sheetStyle]}
        >
          <View className="flex-1 rounded-t-[32px] bg-background-modal px-5 pt-3">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-border-primary" />

            <Text className="mb-3 text-xl font-bold text-label-primary">
              {texts.title}
            </Text>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-3.5 pb-10"
            >
              <View>
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-label-primary">
                  {texts.modeLabel}
                </Text>
                <View className="flex-row gap-3">
                  <ModeButton
                    label={texts.ownVehicle}
                    icon={Car}
                    selected={mode === 'OWN_VEHICLE'}
                    onPress={() => onModeChange('OWN_VEHICLE')}
                  />
                  <ModeButton
                    label={texts.ride}
                    icon={CarFront}
                    selected={mode === 'RIDE'}
                    onPress={() => onModeChange('RIDE')}
                  />
                </View>
              </View>

              <View>
                <Text className={FIELD_LABEL}>{texts.origin}</Text>
                <TextInput
                  placeholder={texts.originPlaceholder}
                  placeholderTextColor={LabelPlaceholder}
                  value={values.origin}
                  maxLength={200}
                  onChangeText={v => onFieldValueChange('origin', v)}
                  className={FIELD_INPUT}
                />
                {errors.origin ? (
                  <Text className={FIELD_ERROR}>{texts.errors.origin}</Text>
                ) : null}
              </View>

              <View>
                <Text className={FIELD_LABEL}>{texts.destination}</Text>
                <TextInput
                  placeholder={texts.destinationPlaceholder}
                  placeholderTextColor={LabelPlaceholder}
                  value={values.destination}
                  maxLength={200}
                  onChangeText={v => onFieldValueChange('destination', v)}
                  className={FIELD_INPUT}
                />
                {errors.destination ? (
                  <Text className={FIELD_ERROR}>
                    {texts.errors.destination}
                  </Text>
                ) : null}
              </View>

              {mode === 'OWN_VEHICLE' ? (
                <View>
                  <Text className={FIELD_LABEL}>{texts.vehicle}</Text>
                  {isLoadingVehicles ? (
                    <ActivityIndicator size="small" />
                  ) : vehicleOptions.length === 0 ? (
                    <View className="rounded-2xl border border-border-primary bg-white p-3.5">
                      <Text className="text-sm text-alert-primary">
                        {texts.noVehicles}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Pressable
                        onPress={() => setVehicleDropdownOpen(open => !open)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          selectedVehicleLabel ?? texts.vehiclePlaceholder
                        }
                        className="h-12 flex-row items-center justify-between rounded-2xl border border-border-primary bg-white px-4"
                      >
                        <Text
                          numberOfLines={1}
                          className={
                            selectedVehicleLabel
                              ? 'flex-1 text-[15px] text-label-primary'
                              : 'flex-1 text-[15px] text-label-placeholder'
                          }
                        >
                          {selectedVehicleLabel ?? texts.vehiclePlaceholder}
                        </Text>
                        <Icon
                          as={ChevronDown}
                          size={18}
                          className="ml-2 text-label-tertiary"
                        />
                      </Pressable>

                      {vehicleDropdownOpen ? (
                        <View className="mt-1 overflow-hidden rounded-2xl border border-border-primary bg-white">
                          {vehicleOptions.map((option, index) => (
                            <Pressable
                              key={option.id}
                              accessibilityRole="button"
                              onPress={() => {
                                onFieldValueChange('vehicleId', option.id);
                                setVehicleDropdownOpen(false);
                              }}
                              className={
                                index === 0
                                  ? 'px-4 py-3'
                                  : 'border-t border-border-primary px-4 py-3'
                              }
                            >
                              <Text className="text-sm font-medium text-label-primary">
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  )}
                  {errors.vehicleId ? (
                    <Text className={FIELD_ERROR}>
                      {texts.errors.vehicleId}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View>
                  <Text className={FIELD_LABEL}>{texts.cost}</Text>
                  <TextInput
                    placeholder={texts.costPlaceholder}
                    placeholderTextColor={LabelPlaceholder}
                    value={values.cost}
                    keyboardType="decimal-pad"
                    onChangeText={v => onFieldValueChange('cost', v)}
                    className={FIELD_INPUT}
                  />
                  {errors.cost ? (
                    <Text className={FIELD_ERROR}>{texts.errors.cost}</Text>
                  ) : null}
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className={FIELD_LABEL}>
                    {mode === 'RIDE' ? texts.distanceOptional : texts.distance}
                  </Text>
                  <TextInput
                    placeholder={texts.distancePlaceholder}
                    placeholderTextColor={LabelPlaceholder}
                    value={values.distanceKm}
                    keyboardType="decimal-pad"
                    onChangeText={v => onFieldValueChange('distanceKm', v)}
                    className={FIELD_INPUT}
                  />
                  {errors.distanceKm ? (
                    <Text className={FIELD_ERROR}>
                      {texts.errors.distanceKm}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-1">
                  <Text className={FIELD_LABEL}>{texts.date}</Text>
                  <View className="h-12 flex-row items-center justify-between rounded-2xl border border-border-primary bg-white px-4">
                    <TextInput
                      placeholder={texts.datePlaceholder}
                      placeholderTextColor={LabelPlaceholder}
                      value={displayDate}
                      keyboardType="number-pad"
                      maxLength={10}
                      onChangeText={handleDateChange}
                      className="flex-1 text-[15px] text-label-primary"
                    />
                    <Icon
                      as={Calendar}
                      size={18}
                      className="ml-1 text-label-tertiary"
                    />
                  </View>
                  {errors.occurredOn ? (
                    <Text className={FIELD_ERROR}>
                      {texts.errors.occurredOn}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-details-primary p-3.5">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-semibold text-label-primary">
                    {texts.previewTitle}
                  </Text>
                  <Text className="mt-0.5 text-xs text-label-tertiary">
                    {previewSubtitle}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-label-primary">
                  {texts.previewCost}
                </Text>
              </View>

              <ClientAutocomplete
                label={texts.client}
                placeholder={texts.clientPlaceholder}
                trailingIcon={ChevronDown}
                value={clientSearchTerm}
                status={clientSearchStatus}
                options={clientSearchOptions}
                messages={texts.clientMessages}
                onChangeText={onClientSearchTermChange}
                onSelect={onSelectClient}
              />

              {errors.general ? (
                <Text className="text-sm text-alert-primary">
                  {texts.errors.general}
                </Text>
              ) : null}

              <View className="mt-2 gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={texts.save}
                  disabled={submitting}
                  onPress={onSubmit}
                  className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-button-primary active:opacity-90"
                >
                  <Icon as={Check} size={18} className="text-label-secondary" />
                  <Text className="text-base font-semibold text-label-secondary">
                    {submitting ? texts.saving : texts.save}
                  </Text>
                </Pressable>

                {isEditing && onDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={texts.delete}
                    disabled={submitting}
                    onPress={onDelete}
                    className="h-12 w-full flex-row items-center justify-center gap-2 rounded-full border border-alert-primary bg-white active:opacity-80"
                  >
                    <Icon
                      as={Trash2}
                      size={16}
                      className="text-alert-primary"
                    />
                    <Text className="text-sm font-semibold text-alert-primary">
                      {texts.delete}
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
  sheet: {
    height: SCREEN_HEIGHT * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
});
