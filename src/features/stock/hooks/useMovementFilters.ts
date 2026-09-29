import { useCallback, useState } from 'react';

import type { CalendarRange } from 'shared/utils/calendar';

import {
  EMPTY_MOVEMENT_FILTERS,
  hasActiveFilters,
  hasNarrowingFilters,
  type MovementFilters,
} from '../domain/movementFilters';

type MovementFiltersState = {
  filters: MovementFilters;
  isFiltering: boolean;
  isNarrowing: boolean;
  setItemName: (itemName: string) => void;
  setRange: (range: CalendarRange) => void;
  clearFilters: () => void;
};

export function useMovementFilters(): MovementFiltersState {
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

  return {
    filters,
    isFiltering: hasActiveFilters(filters),
    isNarrowing: hasNarrowingFilters(filters),
    setItemName,
    setRange,
    clearFilters,
  };
}
