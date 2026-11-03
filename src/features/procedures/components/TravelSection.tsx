import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import {
  TripListItem,
  type Trip,
  type TripListItemTexts,
  type TripMode,
} from 'features/trips';
import { LabelPlaceholder } from 'theme/colors';

const FIELD_LABEL = 'text-xs font-semibold uppercase text-label-primary';
const FIELD_BOX =
  'h-11 justify-center rounded-xl border border-border-primary bg-white px-3';

export type TravelSectionTexts = {
  title: string;
  emptyMessage: string;
  register: string;
  collapse: string;
  ownVehicle: string;
  ride: string;
  noVehicles: string;
  addVehicle: string;
  vehicleLabel: string;
  vehiclePlaceholder: string;
  distanceLabel: string;
  distanceOptionalLabel: string;
  distancePlaceholder: string;
  costLabel: string;
  costPlaceholder: string;
  originLabel: string;
  originPlaceholder: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  estimatedCost: string;
  confirm: string;
  saving: string;
};

export type TravelSectionRow = {
  trip: Trip;
  texts: TripListItemTexts;
};

export type TravelSectionVehicleOption = {
  id: string;
  label: string;
};

type TravelSectionProps = {
  editable: boolean;
  texts: TravelSectionTexts;
  rows: TravelSectionRow[];
  vehicleOptions: TravelSectionVehicleOption[];
  selectedVehicleLabel: string | null;
  hasNoVehicles: boolean;
  expanded: boolean;
  mode: TripMode;
  origin: string;
  destination: string;
  distanceKm: string;
  cost: string;
  previewCost: string;
  submitting: boolean;
  errorMessage: string | null;
  onToggleExpanded: () => void;
  onModeChange: (mode: TripMode) => void;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onSelectVehicle: (id: string) => void;
  onDistanceKmChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onConfirm: () => void;
  onDeleteTrip: (trip: Trip) => void;
  onOpenVehicles?: () => void;
};

type ModeChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ModeChip({ label, selected, onPress }: ModeChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? 'flex-1 items-center rounded-xl bg-button-primary py-2.5'
          : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-2.5'
      }
    >
      <Text
        className={
          selected
            ? 'text-xs font-semibold text-label-secondary'
            : 'text-xs text-label-primary'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  numeric = false,
}: FieldProps) {
  return (
    <View className="gap-1.5">
      <Text className={FIELD_LABEL}>{label}</Text>
      <View className={FIELD_BOX}>
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={LabelPlaceholder}
          value={value}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          onChangeText={onChangeText}
          className="text-sm text-label-primary"
        />
      </View>
    </View>
  );
}

export function TravelSection({
  editable,
  texts,
  rows,
  vehicleOptions,
  selectedVehicleLabel,
  hasNoVehicles,
  expanded,
  mode,
  origin,
  destination,
  distanceKm,
  cost,
  previewCost,
  submitting,
  errorMessage,
  onToggleExpanded,
  onModeChange,
  onOriginChange,
  onDestinationChange,
  onSelectVehicle,
  onDistanceKmChange,
  onCostChange,
  onConfirm,
  onDeleteTrip,
  onOpenVehicles,
}: TravelSectionProps) {
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);

  return (
    <View className="gap-2">
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

      {expanded ? (
        <View className="gap-3 rounded-2xl bg-white p-4">
          <View className="flex-row gap-2">
            <ModeChip
              label={texts.ownVehicle}
              selected={mode === 'OWN_VEHICLE'}
              onPress={() => onModeChange('OWN_VEHICLE')}
            />
            <ModeChip
              label={texts.ride}
              selected={mode === 'RIDE'}
              onPress={() => onModeChange('RIDE')}
            />
          </View>

          {mode === 'OWN_VEHICLE' ? (
            <>
              {hasNoVehicles ? (
                <View className="rounded-xl border border-border-primary bg-background-modal p-3">
                  <Text className="text-xs text-label-primary">
                    {texts.noVehicles}
                  </Text>
                  {onOpenVehicles ? (
                    <Pressable
                      onPress={onOpenVehicles}
                      accessibilityRole="button"
                      className="mt-2"
                    >
                      <Text className="text-xs font-bold text-label-quartenery">
                        {texts.addVehicle}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View className="gap-1.5">
                  <Text className={FIELD_LABEL}>{texts.vehicleLabel}</Text>
                  <Pressable
                    onPress={() => setVehiclePickerOpen(open => !open)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedVehicleLabel ?? texts.vehiclePlaceholder
                    }
                    className={FIELD_BOX}
                  >
                    <Text
                      className={
                        selectedVehicleLabel
                          ? 'text-sm text-label-primary'
                          : 'text-sm text-label-placeholder'
                      }
                    >
                      {selectedVehicleLabel ?? texts.vehiclePlaceholder}
                    </Text>
                  </Pressable>

                  {vehiclePickerOpen ? (
                    <View className="rounded-xl border border-border-primary bg-white">
                      {vehicleOptions.map((option, index) => (
                        <Pressable
                          key={option.id}
                          accessibilityRole="button"
                          onPress={() => {
                            onSelectVehicle(option.id);
                            setVehiclePickerOpen(false);
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

              <Field
                label={texts.distanceLabel}
                placeholder={texts.distancePlaceholder}
                value={distanceKm}
                onChangeText={onDistanceKmChange}
                numeric
              />
            </>
          ) : (
            <>
              <Field
                label={texts.costLabel}
                placeholder={texts.costPlaceholder}
                value={cost}
                onChangeText={onCostChange}
                numeric
              />
              <Field
                label={texts.distanceOptionalLabel}
                placeholder={texts.distancePlaceholder}
                value={distanceKm}
                onChangeText={onDistanceKmChange}
                numeric
              />
            </>
          )}

          <Field
            label={texts.originLabel}
            placeholder={texts.originPlaceholder}
            value={origin}
            onChangeText={onOriginChange}
          />
          <Field
            label={texts.destinationLabel}
            placeholder={texts.destinationPlaceholder}
            value={destination}
            onChangeText={onDestinationChange}
          />

          <View className="flex-row items-center justify-between border-t border-border-primary pt-2">
            <Text className="text-xs font-semibold text-label-tertiary">
              {texts.estimatedCost}
            </Text>
            <Text className="text-sm font-bold text-label-primary">
              {previewCost}
            </Text>
          </View>

          {errorMessage ? (
            <Text className="text-xs text-alert-primary">{errorMessage}</Text>
          ) : null}

          <Button
            icon={Check}
            shape="pill"
            className="h-[49px] w-full"
            disabled={submitting}
            onPress={onConfirm}
          >
            <Text className="font-semibold text-label-secondary">
              {submitting ? texts.saving : texts.confirm}
            </Text>
          </Button>
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View className="overflow-hidden rounded-2xl bg-white">
          {rows.map((row, index) => (
            <View
              key={row.trip.id}
              className={index > 0 ? 'border-t border-border-primary' : ''}
            >
              <TripListItem
                trip={row.trip}
                texts={row.texts}
                onDelete={editable ? onDeleteTrip : undefined}
              />
            </View>
          ))}
        </View>
      ) : !expanded ? (
        <View className="rounded-2xl bg-white px-3.5 py-3">
          <Text className="text-[13px] text-label-placeholder">
            {texts.emptyMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
