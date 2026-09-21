import { useCallback, useMemo, useState } from 'react';

import type { CalendarRange } from 'shared/utils/calendar';

import {
  EMPTY_MOVEMENT_FILTERS,
  filterMovements,
  hasActiveFilters,
  type MovementFilters,
} from '../domain/movementFilters';
import type { StockMovement } from '../domain/stockMovement';

type MovementFiltersState = {
  filters: MovementFilters;
  visibleMovements: StockMovement[];
  isFiltering: boolean;
  setItemName: (itemName: string) => void;
  setRange: (range: CalendarRange) => void;
  clearFilters: () => void;
};

export function useMovementFilters(
  movements: readonly StockMovement[],
): MovementFiltersState {
  const [filters, setFilters] = useState<MovementFilters>(
    EMPTY_MOVEMENT_FILTERS,
  );

  const setItemName = useCallback(
    (itemName: string) => setFilters(current => ({ ...current, itemName })),
    [],
  );

  const setRange = useCallback(
    (range: CalendarRange) => setFilters(current => ({ ...current, range })),
    [],
  );

  const clearFilters = useCallback(
    () => setFilters(EMPTY_MOVEMENT_FILTERS),
    [],
  );

  const visibleMovements = useMemo(
    () => filterMovements(movements, filters),
    [movements, filters],
  );

  return {
    filters,
    visibleMovements,
    isFiltering: hasActiveFilters(filters),
    setItemName,
    setRange,
    clearFilters,
  };
}
