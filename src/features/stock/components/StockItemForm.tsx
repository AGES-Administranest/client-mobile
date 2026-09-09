import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

import { ChipSelector } from './ChipSelector';
import { FormField } from './FormField';
import {
  MEASUREMENT_UNITS,
  STOCK_CATEGORIES,
  type MeasurementUnit,
  type StockCategory,
} from '../domain/stockItem';

/** Field values exactly as typed — strings, so "12." survives while typing. */
export type StockItemFormValues = {
  category: StockCategory | null;
  name: string;
  unit: MeasurementUnit | null;
  defaultUnitCost: string;
  currentQuantity: string;
  minimumStock: string;
  expirationDate: string;
};

export type StockItemTextField = Exclude<
  keyof StockItemFormValues,
  'category' | 'unit'
>;

/** Every string the form shows, already translated by the screen. */
export type StockItemFormLabels = {
  title: string;
  fields: Record<keyof StockItemFormValues, string>;
  placeholders: Partial<Record<StockItemTextField, string>>;
  categories: Record<StockCategory, string>;
  units: Record<MeasurementUnit, string>;
  edit: string;
  delete: string;
};

type StockItemFormProps = {
  values: StockItemFormValues;
  errors: Partial<Record<keyof StockItemFormValues, string>>;
  labels: StockItemFormLabels;
  isSaving: boolean;
  onChange: (field: StockItemTextField, text: string) => void;
  onSelectCategory: (category: StockCategory) => void;
  onSelectUnit: (unit: MeasurementUnit) => void;
  onSubmit: () => void;
  onDelete: () => void;
};

// The edit sheet's body (Figma "Novo insumo ou medicamento", edit variant).
// Purely presentational: values, errors and labels come in, taps go out.
export function StockItemForm({
  values,
  errors,
  labels,
  isSaving,
  onChange,
  onSelectCategory,
  onSelectUnit,
  onSubmit,
  onDelete,
}: StockItemFormProps) {
  return (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-label-primary">
        {labels.title}
      </Text>

      <ChoiceField label={labels.fields.category} error={errors.category}>
        <ChipSelector
          options={STOCK_CATEGORIES}
          value={values.category}
          labels={labels.categories}
          onSelect={onSelectCategory}
        />
      </ChoiceField>

      <FormField
        label={labels.fields.name}
        placeholder={labels.placeholders.name}
        value={values.name}
        error={errors.name}
        onChangeText={text => onChange('name', text)}
      />

      <FormField
        label={labels.fields.defaultUnitCost}
        placeholder={labels.placeholders.defaultUnitCost}
        value={values.defaultUnitCost}
        error={errors.defaultUnitCost}
        keyboardType="decimal-pad"
        onChangeText={text => onChange('defaultUnitCost', text)}
      />

      <ChoiceField label={labels.fields.unit} error={errors.unit}>
        <ChipSelector
          options={MEASUREMENT_UNITS}
          value={values.unit}
          labels={labels.units}
          onSelect={onSelectUnit}
        />
      </ChoiceField>

      <FormField
        label={labels.fields.currentQuantity}
        value={values.currentQuantity}
        error={errors.currentQuantity}
        keyboardType="decimal-pad"
        onChangeText={text => onChange('currentQuantity', text)}
      />

      <FormField
        label={labels.fields.minimumStock}
        value={values.minimumStock}
        error={errors.minimumStock}
        keyboardType="decimal-pad"
        onChangeText={text => onChange('minimumStock', text)}
      />

      <FormField
        label={labels.fields.expirationDate}
        placeholder={labels.placeholders.expirationDate}
        value={values.expirationDate}
        error={errors.expirationDate}
        onChangeText={text => onChange('expirationDate', text)}
      />

      <View className="gap-2 pt-2">
        <Button shape="pill" disabled={isSaving} onPress={onSubmit}>
          <Text>{labels.edit}</Text>
        </Button>
        <Button
          shape="pill"
          variant="destructive"
          disabled={isSaving}
          onPress={onDelete}
        >
          <Text>{labels.delete}</Text>
        </Button>
      </View>
    </View>
  );
}

type ChoiceFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

// Same label/error frame as FormField, but around a chip row instead of an
// Input. Local to this file: nothing else needs it yet.
function ChoiceField({ label, error, children }: ChoiceFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium uppercase text-label-tertiary">
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}
