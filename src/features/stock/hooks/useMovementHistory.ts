import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import {
  toMovementQuery,
  type MovementFilters,
} from '../domain/movementFilters';
import { mergePendingMovements } from '../domain/pendingMovement';
import {
  sortMovementsByDate,
  type StockMovement,
} from '../domain/stockMovement';
import { loadPendingMovements } from '../services/pendingMovementsRepository';
import { fetchStockMovements } from '../services/stockMovementService';

const SEARCH_DEBOUNCE_MS = 300;

type MovementHistoryState = {
  movements: StockMovement[];
  pendingIds: string[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
};

function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

export function useMovementHistory(
  filters: MovementFilters,
  searchDebounceMs: number = SEARCH_DEBOUNCE_MS,
): MovementHistoryState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [debouncedItemName, setDebouncedItemName] = useState(filters.itemName);

  useEffect(() => {
    if (filters.itemName === debouncedItemName) {
      return;
    }

    const timer = setTimeout(
      () => setDebouncedItemName(filters.itemName),
      searchDebounceMs,
    );

    return () => clearTimeout(timer);
  }, [filters.itemName, debouncedItemName, searchDebounceMs]);

  const query = useMemo(
    () =>
      toMovementQuery({ itemName: debouncedItemName, range: filters.range }),
    [debouncedItemName, filters.range],
  );

  const applied = useMemo<MovementFilters>(
    () => ({ itemName: debouncedItemName, range: filters.range }),
    [debouncedItemName, filters.range],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setHasError(false);

    (async () => {
      const pending = userId ? await loadPendingMovements(userId) : [];

      try {
        const confirmed = await fetchStockMovements(
          requireToken(idToken),
          query,
        );

        return { merged: mergePendingMovements(confirmed, pending, applied) };
      } catch (error) {
        return {
          merged: { movements: [], pendingIds: [] },
          error,
        };
      }
    })()
      .then(({ merged, error }) => {
        if (!isMounted) return;
        setMovements(sortMovementsByDate(merged.movements));
        setPendingIds(merged.pendingIds);
        setHasError(error !== undefined);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasError(true);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, userId, query, applied, attempt]);

  const retry = useCallback(() => setAttempt(current => current + 1), []);

  return { movements, pendingIds, isLoading, hasError, retry };
}
