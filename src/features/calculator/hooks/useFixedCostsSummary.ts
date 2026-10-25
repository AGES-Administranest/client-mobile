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

type UseFixedCostsSummaryOptions = {
  period?: { month: number; year: number };
  onSaved?: (summary: FixedCostsSummary) => void;
};

// Zero shows as an empty field, so the Figma's "Ex.: 350" placeholder
// appears while no transport cost has been set.
function toTransportInput(amount: number): string {
  return amount === 0 ? '' : formatAmountInput(amount);
}

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

export function useFixedCostsSummary({
  period,
  onSaved,
}: UseFixedCostsSummaryOptions = {}): FixedCostsSummaryState {
  const { session } = useAuth();
  const month = period?.month;
  const year = period?.year;
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
      return fetchFixedCostsSummary(
        idToken,
        month && year ? { month, year } : undefined,
      );
    })()
      .then(loaded => {
        if (!isMounted) return;
        setSummary(loaded);
        setTransportInput(toTransportInput(loaded.transportCost));
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
  }, [idToken, month, year, attempt]);

  const onTransportChange = useCallback((text: string) => {
    setTransportInput(maskCurrencyInput(text));
    setTransportError(null);
  }, []);

  const onTransportBlur = useCallback(() => {
    if (!summary || !idToken || isSaving) {
      return;
    }

    if (!transportInput.trim() && summary.transportCost === 0) {
      setTransportError(null);
      return;
    }

    const validation = validateTransportCost(transportInput);
    if (validation) {
      setTransportError(TRANSPORT_ERROR_KEYS[validation]);
      return;
    }

    const amount = parseCurrencyInput(transportInput) ?? 0;
    if (amount === summary.transportCost) {
      setTransportInput(toTransportInput(amount));
      return;
    }

    setIsSaving(true);
    updateTransportCost(
      idToken,
      amount,
      month && year ? { month, year } : undefined,
    )
      .then(updated => {
        setSummary(updated);
        setTransportInput(toTransportInput(updated.transportCost));
        setTransportError(null);
        onSaved?.(updated);
      })
      .catch(error => {
        setTransportInput(toTransportInput(summary.transportCost));
        setTransportError(failureKey(error));
      })
      .finally(() => setIsSaving(false));
  }, [summary, idToken, isSaving, transportInput, month, year, onSaved]);

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
