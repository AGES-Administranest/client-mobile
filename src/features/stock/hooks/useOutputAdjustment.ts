import { useCallback, useEffect, useState } from 'react';

import {
  digitsOnly,
  EMPTY_OUTPUT_ADJUSTMENT,
  isAdjustmentValid,
  parseQuantity,
  requiresWrittenReason,
  validateOutputAdjustment,
  type AdjustmentReason,
  type OutputAdjustmentDraft,
  type OutputAdjustmentErrors,
} from '../domain/outputAdjustment';
import {
  createOutputAdjustment,
  fetchAdjustableItems,
  StockAdjustmentError,
  type AdjustableItem,
} from '../services/stockAdjustmentService';

export type AdjustmentFailure = {
  code: string;
  params: Record<string, string | number>;
};

type OutputAdjustmentState = {
  draft: OutputAdjustmentDraft;
  items: AdjustableItem[];
  errors: OutputAdjustmentErrors;
  failure: AdjustmentFailure | null;
  isSaving: boolean;
  needsWrittenReason: boolean;
  setItemId: (itemId: string) => void;
  setQuantity: (quantity: string) => void;
  setReason: (reason: AdjustmentReason) => void;
  setOtherReason: (otherReason: string) => void;
  reset: () => void;
  submit: () => Promise<boolean>;
};

export function useOutputAdjustment(): OutputAdjustmentState {
  const [draft, setDraft] = useState<OutputAdjustmentDraft>(
    EMPTY_OUTPUT_ADJUSTMENT,
  );
  const [items, setItems] = useState<AdjustableItem[]>([]);
  const [errors, setErrors] = useState<OutputAdjustmentErrors>({});
  const [failure, setFailure] = useState<AdjustmentFailure | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchAdjustableItems()
      .then(result => {
        if (isMounted) {
          setItems(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setItemId = useCallback(
    (itemId: string) => setDraft(current => ({ ...current, itemId })),
    [],
  );

  const setQuantity = useCallback(
    (quantity: string) =>
      setDraft(current => ({ ...current, quantity: digitsOnly(quantity) })),
    [],
  );

  const setReason = useCallback(
    (reason: AdjustmentReason) =>
      setDraft(current => ({
        ...current,
        reason,
        otherReason: requiresWrittenReason(reason) ? current.otherReason : '',
      })),
    [],
  );

  const setOtherReason = useCallback(
    (otherReason: string) => setDraft(current => ({ ...current, otherReason })),
    [],
  );

  const reset = useCallback(() => {
    setDraft(EMPTY_OUTPUT_ADJUSTMENT);
    setErrors({});
    setFailure(null);
    setIsSaving(false);
  }, []);

  const submit = useCallback(async () => {
    const validationErrors = validateOutputAdjustment(draft);
    setErrors(validationErrors);
    setFailure(null);

    if (!isAdjustmentValid(validationErrors)) {
      return false;
    }

    setIsSaving(true);

    try {
      await createOutputAdjustment({
        itemId: draft.itemId as string,
        quantity: parseQuantity(draft.quantity),
        reason: draft.reason as AdjustmentReason,
        notes: requiresWrittenReason(draft.reason)
          ? draft.otherReason.trim()
          : null,
      });

      setIsSaving(false);
      return true;
    } catch (error) {
      setIsSaving(false);
      setFailure(
        error instanceof StockAdjustmentError
          ? { code: error.code, params: error.params }
          : { code: 'UNKNOWN', params: {} },
      );
      return false;
    }
  }, [draft]);

  return {
    draft,
    items,
    errors,
    failure,
    isSaving,
    needsWrittenReason: requiresWrittenReason(draft.reason),
    setItemId,
    setQuantity,
    setReason,
    setOtherReason,
    reset,
    submit,
  };
}
