import type { MeasurementUnit, StockCategory, StockItem } from './stockItem';

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

// Item → what the inputs show. Numbers become strings; a missing expiry
// becomes an empty field.
export function toFormValues(item: StockItem): StockItemFormValues {
  return {
    category: item.category,
    name: item.name,
    unit: item.unit,
    defaultUnitCost: String(item.defaultUnitCost),
    currentQuantity: String(item.currentQuantity),
    minimumStock: String(item.minimumStock),
    expirationDate: item.expirationDate ?? '',
  };
}

// What the inputs hold → candidate item for validation. An empty numeric
// field becomes NaN on purpose: `validateStockItem` reports it as `required`.
// Category and unit may still be null here; validation flags them too.
export function fromFormValues(
  id: string,
  values: StockItemFormValues,
): Omit<StockItem, 'id'> & { id: string } {
  return {
    id,
    category: values.category as StockCategory,
    name: values.name,
    unit: values.unit as MeasurementUnit,
    defaultUnitCost: toNumber(values.defaultUnitCost),
    currentQuantity: toNumber(values.currentQuantity),
    minimumStock: toNumber(values.minimumStock),
    expirationDate:
      values.expirationDate.trim() === '' ? null : values.expirationDate.trim(),
  };
}

function toNumber(text: string): number {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}
