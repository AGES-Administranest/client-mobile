import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import type { FixedCostsSummary } from '../domain/fixedCostsSummary';
import { fetchFixedCostsSummary } from '../services/fixedCostsSummaryService';

export type FixedCostsSummaryState = {
  summary: FixedCostsSummary | null;
  isLoading: boolean;
  loadError: TranslationKey | null;
  retry: () => void;
};

type UseFixedCostsSummaryOptions = {
  period?: { month: number; year: number };
};

function failureKey(error: unknown): TranslationKey {
  return error instanceof ApiError && error.status === 401
    ? 'calculator.fixedCosts.errors.session'
    : 'calculator.fixedCosts.errors.generic';
}

export function useFixedCostsSummary({
  period,
}: UseFixedCostsSummaryOptions = {}): FixedCostsSummaryState {
  const { session } = useAuth();
  const month = period?.month;
  const year = period?.year;
  const idToken = session?.idToken ?? null;
  const [summary, setSummary] = useState<FixedCostsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
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
        if (isMounted) setSummary(loaded);
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

  const retry = useCallback(() => setAttempt(current => current + 1), []);

  return { summary, isLoading, loadError, retry };
}
