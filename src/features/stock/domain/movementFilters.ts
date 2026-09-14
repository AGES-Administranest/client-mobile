import {
  EMPTY_CALENDAR_RANGE,
  isWithinCalendarRange,
  toCalendarDate,
  type CalendarRange,
} from 'shared/utils/calendar';

import type { StockMovement } from './stockMovement';

export type MovementFilters = {
  itemName: string;
  range: CalendarRange;
};

export const EMPTY_MOVEMENT_FILTERS: MovementFilters = {
  itemName: '',
  range: EMPTY_CALENDAR_RANGE,
};

export function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesItemName(
  movement: StockMovement,
  itemName: string,
): boolean {
  const term = normalizeSearchTerm(itemName);

  if (term === '') {
    return true;
  }

  return normalizeSearchTerm(movement.itemName).includes(term);
}

export function matchesPeriod(
  movement: StockMovement,
  range: CalendarRange,
): boolean {
  return isWithinCalendarRange(toCalendarDate(movement.occurredAt), range);
}

export function filterMovements(
  movements: readonly StockMovement[],
  filters: MovementFilters,
): StockMovement[] {
  return movements.filter(
    movement =>
      matchesItemName(movement, filters.itemName) &&
      matchesPeriod(movement, filters.range),
  );
}

export function hasActiveFilters(filters: MovementFilters): boolean {
  return (
    normalizeSearchTerm(filters.itemName) !== '' ||
    filters.range.from !== null ||
    filters.range.to !== null
  );
}
