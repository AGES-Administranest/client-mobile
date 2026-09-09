import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

import { CategorySelector } from './CategorySelector';
import { FormField } from './FormField';
import type { StockCategory } from '../domain/stockItem';

/** Field values exactly as typed — strings, so "12." survives while typing. */
export type StockItemFormValues = {
  category: StockCategory | null;
  name: string;
  unitCost: string;
  unit: string;
  quantity: string;
  minimumQuantity: string;
  expirationDate: string;
};

export type StockItemTextField = Exclude<keyof StockItemFormValues, 'category'>;

/** Every string the form shows, already translated by the screen. */
export type StockItemFormLabels = {
  title: string;
  fields: Record<keyof StockItemFormValues, string>;
  placeholders: Partial<Record<StockItemTextField, string>>;
  categories: Record<StockCategory, string>;
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
  onSubmit,
  onDelete,
}: StockItemFormProps) {
  return (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-label-primary">
        {labels.title}
      </Text>

      <View className="gap-1">
        <Text className="text-xs font-medium uppercase text-label-tertiary">
          {labels.fields.category}
        </Text>
        <CategorySelector
          value={values.category}
          labels={labels.categories}
          onSelect={onSelectCategory}
        />
        {errors.category ? (
          <Text className="text-xs text-alert-primary">{errors.category}</Text>
        ) : null}
      </View>

      <FormField
        label={labels.fields.name}
        placeholder={labels.placeholders.name}
        value={values.name}
        error={errors.name}
        onChangeText={text => onChange('name', text)}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label={labels.fields.unitCost}
            placeholder={labels.placeholders.unitCost}
            value={values.unitCost}
            error={errors.unitCost}
            keyboardType="decimal-pad"
            onChangeText={text => onChange('unitCost', text)}
          />
        </View>
        <View className="flex-1">
          <FormField
            label={labels.fields.unit}
            placeholder={labels.placeholders.unit}
            value={values.unit}
            error={errors.unit}
            onChangeText={text => onChange('unit', text)}
          />
        </View>
      </View>

      <FormField
        label={labels.fields.quantity}
        value={values.quantity}
        error={errors.quantity}
        keyboardType="decimal-pad"
        onChangeText={text => onChange('quantity', text)}
      />

      <FormField
        label={labels.fields.minimumQuantity}
        value={values.minimumQuantity}
        error={errors.minimumQuantity}
        keyboardType="decimal-pad"
        onChangeText={text => onChange('minimumQuantity', text)}
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
