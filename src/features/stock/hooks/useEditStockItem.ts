import { useState } from 'react';

import type {
  MeasurementUnit,
  StockCategory,
  StockItem,
} from '../domain/stockItem';
import {
  fromFormValues,
  toFormValues,
  type StockItemFormValues,
  type StockItemTextField,
} from '../domain/stockItemFormValues';
import {
  isStockItemValid,
  validateStockItem,
  type StockItemErrors,
} from '../domain/validateStockItem';
import { deleteStockItem, updateStockItem } from '../services/stockItemService';

type Callbacks = {
  onSaved: (item: StockItem) => void;
  onDeleted: (id: string) => void;
};

// Owns the edit form's state for one item: what is typed, which fields failed,
// and whether a save/delete is in flight. Wires domain (validation, string ↔
// number conversion) to the service; the screen only renders what comes back.
export function useEditStockItem(item: StockItem, callbacks: Callbacks) {
  const [values, setValues] = useState<StockItemFormValues>(() =>
    toFormValues(item),
  );
  const [errors, setErrors] = useState<StockItemErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: StockItemTextField, text: string) =>
    setValues(current => ({ ...current, [field]: text }));

  const selectCategory = (category: StockCategory) =>
    setValues(current => ({ ...current, category }));

  const selectUnit = (unit: MeasurementUnit) =>
    setValues(current => ({ ...current, unit }));

  async function submit(): Promise<void> {
    const candidate = fromFormValues(item.id, values);
    const validation = validateStockItem(candidate);
    setErrors(validation);
    if (!isStockItemValid(validation)) return;

    setIsSaving(true);
    try {
      const saved = await updateStockItem(candidate);
      callbacks.onSaved(saved);
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(): Promise<void> {
    setIsSaving(true);
    try {
      await deleteStockItem(item.id);
      callbacks.onDeleted(item.id);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    values,
    errors,
    isSaving,
    setField,
    selectCategory,
    selectUnit,
    submit,
    remove,
  };
}
