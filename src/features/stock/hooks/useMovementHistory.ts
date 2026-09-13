import { useCallback, useEffect, useState } from 'react';

import {
  sortMovementsByDate,
  type StockMovement,
} from '../domain/stockMovement';
import { fetchStockMovements } from '../services/stockMovementService';

type MovementHistoryState = {
  movements: StockMovement[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
};

export function useMovementHistory(): MovementHistoryState {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setHasError(false);

    fetchStockMovements()
      .then(result => {
        if (isMounted) {
          setMovements(sortMovementsByDate(result));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt(current => current + 1), []);

  return { movements, isLoading, hasError, retry };
}
