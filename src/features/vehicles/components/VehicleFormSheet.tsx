import { Check, Gauge, Pencil, Plus, Trash2 } from 'lucide-react-native';
import {
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

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { LabelPlaceholder } from 'theme/colors';

import {
  FUEL_TYPES,
  type VehicleFormErrorCode,
  type VehicleFormErrors,
  type VehicleFormValues,
} from '../domain/validateVehicleForm';
import type { FuelType, VehicleFormMode } from '../domain/vehicle.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type VehicleFormTexts = {
  title: string;
  close: string;
  labels: {
    brand: string;
    model: string;
    fuelType: string;
    avgConsumptionKmL: string;
    fuelPrice: string;
  };
  placeholders: {
    brand: string;
    model: string;
    avgConsumptionKmL: string;
    fuelPrice: string;
  };
  fuelTypes: Record<FuelType, string>;
  estimatedCostTitle: string;
  estimatedCostValue: string;
  buttons: {
    add: string;
    edit: string;
    confirm: string;
    inactivate: string;
  };
  errors: Partial<
    Record<VehicleFormErrorCode | 'submitFailed' | 'inactivateFailed', string>
  >;
};

type VehicleFormSheetProps = {
  visible: boolean;
  mode: VehicleFormMode;
  values: VehicleFormValues;
  errors?: VehicleFormErrors;
  submitting?: boolean;
  submitError?: string | null;
  costPerKmEstimate?: number | null;
  texts: VehicleFormTexts;
  onChangeField: <K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K],
  ) => void;
  onStartEdit: () => void;
  onSubmit: () => void;
  onInactivate: () => void;
  onClose: () => void;
};

export function VehicleFormSheet({
  visible,
  mode,
  values,
  errors = {},
  submitting = false,
  submitError = null,
  costPerKmEstimate = null,
  texts,
  onChangeField,
  onStartEdit,
  onSubmit,
  onInactivate,
  onClose,
}: VehicleFormSheetProps) {
  const sheet = useSheetAnimation(visible, onClose);
  const isReadOnly = mode === 'view';

  const brandError = errors.brand ? texts.errors[errors.brand] : undefined;
  const modelError = errors.model ? texts.errors[errors.model] : undefined;
  const consumptionError = errors.avgConsumptionKmL
    ? texts.errors[errors.avgConsumptionKmL]
    : undefined;
  const priceError = errors.fuelPrice
    ? texts.errors[errors.fuelPrice]
    : undefined;
  const generalSubmitError = submitError
    ? texts.errors[submitError as 'submitFailed' | 'inactivateFailed']
    : undefined;

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          style={{
            maxHeight: SCREEN_HEIGHT * 0.92,
            ...sheet.sheetStyle,
          }}
        >
          <View className="shrink gap-3 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <Text className="text-xl font-bold text-label-primary">
              {texts.title}
            </Text>

            <View className="h-px bg-details-primary" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-2"
            >
              <FormField
                label={texts.labels.brand}
                placeholder={texts.placeholders.brand}
                value={values.brand}
                error={brandError}
                editable={!isReadOnly}
                onChangeText={v => onChangeField('brand', v)}
              />

              <FormField
                label={texts.labels.model}
                placeholder={texts.placeholders.model}
                value={values.model}
                error={modelError}
                editable={!isReadOnly}
                onChangeText={v => onChangeField('model', v)}
              />

              <View className="mb-3">
                <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
                  {texts.labels.fuelType}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {FUEL_TYPES.map(fuel => {
                    const isSelected = values.fuelType === fuel;
                    return (
                      <Pressable
                        key={fuel}
                        accessibilityRole="button"
                        disabled={isReadOnly}
                        onPress={() => onChangeField('fuelType', fuel)}
                        className={
                          isSelected
                            ? 'flex-1 min-w-[70px] items-center rounded-xl bg-button-primary py-2.5 px-2'
                            : 'flex-1 min-w-[70px] items-center rounded-xl border border-border-primary bg-white py-2.5 px-2'
                        }
                      >
                        <Text
                          className={
                            isSelected
                              ? 'text-xs font-semibold text-label-secondary'
                              : 'text-xs text-label-primary'
                          }
                        >
                          {texts.fuelTypes[fuel] ?? fuel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <FormField
                label={texts.labels.avgConsumptionKmL}
                placeholder={texts.placeholders.avgConsumptionKmL}
                value={values.avgConsumptionKmL}
                error={consumptionError}
                keyboardType="decimal-pad"
                editable={!isReadOnly}
                onChangeText={v => onChangeField('avgConsumptionKmL', v)}
              />

              <FormField
                label={texts.labels.fuelPrice}
                placeholder={texts.placeholders.fuelPrice}
                value={values.fuelPrice}
                error={priceError}
                keyboardType="decimal-pad"
                editable={!isReadOnly}
                onChangeText={v => onChangeField('fuelPrice', v)}
              />

              {costPerKmEstimate !== null ? (
                <View className="mb-3 flex-row items-center justify-between rounded-xl border border-border-primary/50 bg-details-primary/50 px-4 py-3">
                  <View className="flex-row items-center gap-2">
                    <Icon as={Gauge} className="size-4 text-label-tertiary" />
                    <Text className="text-xs font-semibold uppercase text-label-tertiary">
                      {texts.estimatedCostTitle}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-label-quartenery">
                    {texts.estimatedCostValue}
                  </Text>
                </View>
              ) : null}

              {generalSubmitError ? (
                <Text className="mb-2 text-sm text-alert-primary">
                  {generalSubmitError}
                </Text>
              ) : null}
            </ScrollView>

            {mode === 'create' ? (
              <Button
                shape="pill"
                icon={Plus}
                className="h-[49px] w-full"
                disabled={submitting}
                onPress={onSubmit}
              >
                <Text className="font-semibold text-label-secondary">
                  {texts.buttons.add}
                </Text>
              </Button>
            ) : mode === 'view' ? (
              <Button
                shape="pill"
                icon={Pencil}
                className="h-[49px] w-full"
                disabled={submitting}
                onPress={onStartEdit}
              >
                <Text className="font-semibold text-label-secondary">
                  {texts.buttons.edit}
                </Text>
              </Button>
            ) : (
              <View className="gap-2.5">
                <Button
                  shape="pill"
                  icon={Check}
                  className="h-[49px] w-full"
                  disabled={submitting}
                  onPress={onSubmit}
                >
                  <Text className="font-semibold text-label-secondary">
                    {texts.buttons.confirm}
                  </Text>
                </Button>
                <Button
                  shape="pill"
                  variant="secondary"
                  icon={Trash2}
                  className="h-[49px] w-full bg-button-secondary"
                  disabled={submitting}
                  onPress={onInactivate}
                >
                  <Text className="font-semibold text-label-secondary">
                    {texts.buttons.inactivate}
                  </Text>
                </Button>
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  onChangeText: (value: string) => void;
};

function FormField({
  label,
  value,
  placeholder,
  error,
  editable = true,
  keyboardType = 'default',
  onChangeText,
}: FormFieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        className={
          editable
            ? 'rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
            : 'rounded-xl border border-border-primary/60 bg-details-primary/40 px-4 py-2.5 text-[15px] text-label-tertiary'
        }
        value={value}
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}
