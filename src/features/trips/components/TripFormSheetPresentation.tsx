import {
  Calendar,
  Car,
  CarTaxiFront,
  Check,
  ChevronDown,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';
import { formatDateInput } from 'shared/utils/inputMasks';
import { LabelPlaceholder } from 'theme/colors';

import type { TripMode } from '../domain/trip.types';
import { displayDateToIso, isoToDisplayDate } from '../domain/tripFormat';
import type {
  TripFormErrors,
  TripFormValues,
} from '../domain/validateTripForm';

const FIELD_LABEL =
  'pb-1.5 text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary';
const FIELD_INPUT =
  'h-[43px] rounded-[10px] border bg-white px-3 text-sm text-label-primary';
const FIELD_ERROR = 'pt-1 text-xs text-alert-primary';

const borderOf = (error: string | undefined) =>
  error ? 'border-alert-primary' : 'border-border-primary';

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
  distancePlaceholder: string;
  date: string;
  datePlaceholder: string;
  previewTitle: string;
  previewFormula: string | null;
  previewPickVehicle: string;
  previewInformDistance: string;
  previewInformed: string;
  previewInformCost: string;
  /** Null while the cost cannot be worked out yet: the box shows a dash. */
  previewCost: string | null;
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
      className={cn(
        'flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] p-[9px]',
        selected
          ? 'bg-button-primary shadow-[0px_5px_5px_rgba(0,0,0,0.1)]'
          : 'bg-white',
      )}
    >
      <Icon
        as={icon}
        size={16}
        className={selected ? 'text-label-secondary' : 'text-label-primary'}
      />
      <Text
        className={cn(
          'text-[13px] font-medium leading-[19.5px]',
          selected ? 'text-label-secondary' : 'text-label-primary',
        )}
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

  // The Figma dims "Salvar" while a field is showing an error; it comes back
  // as each field is edited, which clears its error.
  const hasFieldErrors = Object.entries(errors).some(
    ([field, code]) => field !== 'general' && code !== undefined,
  );

  const previewSubtitle =
    mode === 'OWN_VEHICLE'
      ? texts.previewFormula ??
        (selectedVehicleLabel
          ? texts.previewInformDistance
          : texts.previewPickVehicle)
      : values.cost.trim()
      ? texts.previewInformed
      : texts.previewInformCost;

  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      footer={
        <View className="gap-2.5">
          <Button
            shape="pill"
            icon={Check}
            accessibilityLabel={texts.save}
            className="h-[49px] w-full"
            disabled={submitting || hasFieldErrors}
            onPress={onSubmit}
          >
            <Text>{submitting ? texts.saving : texts.save}</Text>
          </Button>

          {isEditing && onDelete ? (
            <Button
              shape="pill"
              variant="secondary"
              icon={Trash2}
              accessibilityLabel={texts.delete}
              className="h-[49px] w-full bg-button-secondary"
              disabled={submitting}
              onPress={onDelete}
            >
              <Text className="text-label-secondary">{texts.delete}</Text>
            </Button>
          ) : null}
        </View>
      }
    >
      <View>
        <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
          {texts.modeLabel}
        </Text>
        <View className="flex-row gap-2 pt-2">
          <ModeButton
            label={texts.ownVehicle}
            icon={Car}
            selected={mode === 'OWN_VEHICLE'}
            onPress={() => onModeChange('OWN_VEHICLE')}
          />
          <ModeButton
            label={texts.ride}
            icon={CarTaxiFront}
            selected={mode === 'RIDE'}
            onPress={() => onModeChange('RIDE')}
          />
        </View>
      </View>

      <View>
        <Text className={FIELD_LABEL}>{texts.origin}</Text>
        <TextInput
          accessibilityLabel={texts.origin}
          placeholder={texts.originPlaceholder}
          placeholderTextColor={LabelPlaceholder}
          value={values.origin}
          maxLength={200}
          onChangeText={v => onFieldValueChange('origin', v)}
          className={cn(FIELD_INPUT, borderOf(errors.origin))}
        />
        {errors.origin ? (
          <Text className={FIELD_ERROR}>{texts.errors.origin}</Text>
        ) : null}
      </View>

      <View>
        <Text className={FIELD_LABEL}>{texts.destination}</Text>
        <TextInput
          accessibilityLabel={texts.destination}
          placeholder={texts.destinationPlaceholder}
          placeholderTextColor={LabelPlaceholder}
          value={values.destination}
          maxLength={200}
          onChangeText={v => onFieldValueChange('destination', v)}
          className={cn(FIELD_INPUT, borderOf(errors.destination))}
        />
        {errors.destination ? (
          <Text className={FIELD_ERROR}>{texts.errors.destination}</Text>
        ) : null}
      </View>

      {mode === 'OWN_VEHICLE' ? (
        <View>
          <Text className={FIELD_LABEL}>{texts.vehicle}</Text>
          {isLoadingVehicles ? (
            <ActivityIndicator size="small" />
          ) : vehicleOptions.length === 0 ? (
            <View
              accessibilityRole="text"
              className="h-9 flex-row items-center rounded-lg border border-border-primary bg-white pl-3 pr-2"
            >
              <Text
                numberOfLines={1}
                className="flex-1 text-sm text-label-placeholder"
              >
                {texts.noVehicles}
              </Text>
              <Icon
                as={ChevronDown}
                size={16}
                className="ml-2 text-label-tertiary"
              />
            </View>
          ) : (
            <View>
              <Pressable
                onPress={() => setVehicleDropdownOpen(open => !open)}
                accessibilityRole="button"
                accessibilityLabel={
                  selectedVehicleLabel ?? texts.vehiclePlaceholder
                }
                className={cn(
                  'h-9 flex-row items-center rounded-lg border bg-white pl-3 pr-2',
                  borderOf(errors.vehicleId),
                )}
              >
                <Text
                  numberOfLines={1}
                  className={cn(
                    'flex-1 text-sm',
                    selectedVehicleLabel
                      ? 'text-label-primary'
                      : 'text-label-placeholder',
                  )}
                >
                  {selectedVehicleLabel ?? texts.vehiclePlaceholder}
                </Text>
                <Icon
                  as={ChevronDown}
                  size={16}
                  className="ml-2 text-label-tertiary"
                />
              </Pressable>

              {vehicleDropdownOpen ? (
                <View className="mt-1 overflow-hidden rounded-lg border border-border-primary bg-white">
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
                          ? 'px-3 py-2.5'
                          : 'border-t border-border-primary px-3 py-2.5'
                      }
                    >
                      <Text className="text-sm text-label-primary">
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
          {errors.vehicleId ? (
            <Text className={FIELD_ERROR}>{texts.errors.vehicleId}</Text>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className={FIELD_LABEL}>{texts.cost}</Text>
          <TextInput
            accessibilityLabel={texts.cost}
            placeholder={texts.costPlaceholder}
            placeholderTextColor={LabelPlaceholder}
            value={values.cost}
            keyboardType="decimal-pad"
            onChangeText={v => onFieldValueChange('cost', v)}
            className={cn(FIELD_INPUT, borderOf(errors.cost))}
          />
          {errors.cost ? (
            <Text className={FIELD_ERROR}>{texts.errors.cost}</Text>
          ) : null}
        </View>
      )}

      <View>
        <View className="flex-row gap-2.5">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className={FIELD_LABEL}>
              {texts.distance}
            </Text>
            <TextInput
              accessibilityLabel={texts.distance}
              placeholder={texts.distancePlaceholder}
              placeholderTextColor={LabelPlaceholder}
              value={values.distanceKm}
              keyboardType="decimal-pad"
              onChangeText={v => onFieldValueChange('distanceKm', v)}
              className={cn(FIELD_INPUT, borderOf(errors.distanceKm))}
            />
          </View>

          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className={FIELD_LABEL}>
              {texts.date}
            </Text>
            <View
              className={cn(
                'h-[43px] flex-row items-center justify-between rounded-[10px] border bg-white px-3',
                borderOf(errors.occurredOn),
              )}
            >
              <TextInput
                accessibilityLabel={texts.date}
                placeholder={texts.datePlaceholder}
                placeholderTextColor={LabelPlaceholder}
                value={displayDate}
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={handleDateChange}
                className="min-w-0 flex-1 text-sm text-label-primary"
              />
              <Icon
                as={Calendar}
                size={16}
                className="ml-1 text-label-tertiary"
              />
            </View>
          </View>
        </View>
        {errors.distanceKm ? (
          <Text className={FIELD_ERROR}>{texts.errors.distanceKm}</Text>
        ) : null}
        {errors.occurredOn ? (
          <Text className={FIELD_ERROR}>{texts.errors.occurredOn}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between rounded-[10px] bg-details-primary px-3 py-[9px]">
        <View className="flex-1 gap-px pr-2">
          <Text className="text-xs font-medium text-label-primary">
            {texts.previewTitle}
          </Text>
          <Text className="text-[11px] text-label-tertiary">
            {previewSubtitle}
          </Text>
        </View>
        <Text
          className={cn(
            'text-base font-bold',
            texts.previewCost ? 'text-label-primary' : 'text-label-tertiary',
          )}
        >
          {texts.previewCost ?? '—'}
        </Text>
      </View>

      <ClientAutocomplete
        compact
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
    </BottomSheet>
  );
}
