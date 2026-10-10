import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import {
  formatAmountInput,
  maskCurrencyInput,
  parseCurrencyInput,
  validateTransportCost,
  type FixedCostsSummary,
  type TransportCostError,
} from '../domain/fixedCostsSummary';
import {
  fetchFixedCostsSummary,
  updateTransportCost,
} from '../services/fixedCostsSummaryService';

export type FixedCostsSummaryState = {
  summary: FixedCostsSummary | null;
  isLoading: boolean;
  loadError: TranslationKey | null;
  transportInput: string;
  transportError: TranslationKey | null;
  isSaving: boolean;
  onTransportChange: (text: string) => void;
  onTransportBlur: () => void;
  retry: () => void;
};

const TRANSPORT_ERROR_KEYS: Record<TransportCostError, TranslationKey> = {
  required: 'calculator.fixedCosts.errors.required',
  notNumeric: 'calculator.fixedCosts.errors.notNumeric',
  negative: 'calculator.fixedCosts.errors.negative',
};

function failureKey(error: unknown): TranslationKey {
  return error instanceof ApiError && error.status === 401
    ? 'calculator.fixedCosts.errors.session'
    : 'calculator.fixedCosts.errors.generic';
}

export function useFixedCostsSummary(): FixedCostsSummaryState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [summary, setSummary] = useState<FixedCostsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [transportInput, setTransportInput] = useState('');
  const [transportError, setTransportError] = useState<TranslationKey | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);

    (async () => {
      if (!idToken) {
        throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
      }
      return fetchFixedCostsSummary(idToken);
    })()
      .then(loaded => {
        if (!isMounted) return;
        setSummary(loaded);
        setTransportInput(formatAmountInput(loaded.transportCost));
      })
      .catch(error => {
        if (isMounted) setLoadError(failureKey(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, attempt]);

  const onTransportChange = useCallback((text: string) => {
    setTransportInput(maskCurrencyInput(text));
    setTransportError(null);
  }, []);

  const onTransportBlur = useCallback(() => {
    if (!summary || !idToken || isSaving) {
      return;
    }

    const validation = validateTransportCost(transportInput);
    if (validation) {
      setTransportError(TRANSPORT_ERROR_KEYS[validation]);
      return;
    }

    const amount = parseCurrencyInput(transportInput) ?? 0;
    if (amount === summary.transportCost) {
      setTransportInput(formatAmountInput(amount));
      return;
    }

    setIsSaving(true);
    updateTransportCost(idToken, amount)
      .then(updated => {
        setSummary(updated);
        setTransportInput(formatAmountInput(updated.transportCost));
        setTransportError(null);
      })
      .catch(error => {
        setTransportInput(formatAmountInput(summary.transportCost));
        setTransportError(failureKey(error));
      })
      .finally(() => setIsSaving(false));
  }, [summary, idToken, isSaving, transportInput]);

  const retry = useCallback(() => setAttempt(current => current + 1), []);

  return {
    summary,
    isLoading,
    loadError,
    transportInput,
    transportError,
    isSaving,
    onTransportChange,
    onTransportBlur,
    retry,
  };
}
