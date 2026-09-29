import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

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
import type { PendingMovement } from '../domain/pendingMovement';
import { addPendingMovement } from '../services/pendingMovementsRepository';
import {
  fetchAdjustableItems,
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

function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

export function useOutputAdjustment(): OutputAdjustmentState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [draft, setDraft] = useState<OutputAdjustmentDraft>(
    EMPTY_OUTPUT_ADJUSTMENT,
  );
  const [items, setItems] = useState<AdjustableItem[]>([]);
  const [errors, setErrors] = useState<OutputAdjustmentErrors>({});
  const [failure, setFailure] = useState<AdjustmentFailure | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => fetchAdjustableItems(requireToken(idToken)))()
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
  }, [idToken]);

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

    if (!userId) {
      setFailure({ code: 'NO_ACCOUNT', params: {} });
      return false;
    }

    const item = items.find(candidate => candidate.id === draft.itemId);
    const quantity = parseQuantity(draft.quantity);

    if (item && quantity > item.availableQuantity) {
      setFailure({
        code: 'INSUFFICIENT_STOCK',
        params: { available: item.availableQuantity },
      });
      return false;
    }

    setIsSaving(true);

    const movement: PendingMovement = {
      id: randomUUID(),
      itemId: draft.itemId as string,
      itemName: item?.name ?? '',
      unit: item?.unit ?? 'other',
      type: 'outbound',
      source: 'manualAdjustment',
      adjustmentReason: draft.reason as AdjustmentReason,
      quantity,
      unitCost: item?.unitCost ?? 0,
      occurredAt: new Date().toISOString(),
      notes: requiresWrittenReason(draft.reason)
        ? draft.otherReason.trim()
        : null,
    };

    try {
      await addPendingMovement(userId, movement);
      setIsSaving(false);
      return true;
    } catch {
      setIsSaving(false);
      setFailure({ code: 'QUEUE_WRITE_FAILED', params: {} });
      return false;
    }
  }, [draft, items, userId]);

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
