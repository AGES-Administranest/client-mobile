import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import type { FixedCost } from '../domain/fixedCost';
import {
  countActiveFixedCosts,
  sumActiveMonthlyAmount,
} from '../domain/fixedCostSummary';
import { listFixedCosts } from '../services/fixedCostService';

export type FixedCostsState = {
  fixedCosts: FixedCost[];
  visibleFixedCosts: FixedCost[];
  monthlyTotal: number;
  activeCount: number;
  showInactive: boolean;
  toggleShowInactive: () => void;
  isLoading: boolean;
  failure: 'session' | 'unknown' | null;
  setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>;
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function failureFor(error: unknown): 'session' | 'unknown' {
  return error instanceof ApiError && error.status === 401
    ? 'session'
    : 'unknown';
}

// Mesmo formato de hook que `useClinics`: estado de lista com
// loading/failure, e quem chama (a tela) atualiza `fixedCosts` localmente
// depois de criar, editar ou inativar — sem recarregar o backend a cada ação.
export function useFixedCosts(): FixedCostsState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<'session' | 'unknown' | null>(null);

  useEffect(() => {
    if (!idToken) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setFailure(null);

    listFixedCosts(idToken, { month: currentMonth(), includeInactive: true })
      .then(loaded => {
        if (isMounted) setFixedCosts(loaded);
      })
      .catch(error => {
        if (isMounted) setFailure(failureFor(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idToken]);

  const toggleShowInactive = useCallback(
    () => setShowInactive(current => !current),
    [],
  );

  const visibleFixedCosts = showInactive
    ? fixedCosts
    : fixedCosts.filter(fixedCost => fixedCost.active);

  return {
    fixedCosts,
    visibleFixedCosts,
    monthlyTotal: sumActiveMonthlyAmount(fixedCosts),
    activeCount: countActiveFixedCosts(fixedCosts),
    showInactive,
    toggleShowInactive,
    isLoading,
    failure,
    setFixedCosts,
  };
}
