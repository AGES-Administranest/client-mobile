import {
  EMPTY_CALENDAR_RANGE,
  toCalendarDate,
  type CalendarRange,
} from 'shared/utils/calendar';

export type MovementFilters = {
  itemName: string;
  range: CalendarRange;
};

export type MovementQuery = {
  search?: string;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
};

export const EMPTY_MOVEMENT_FILTERS: MovementFilters = {
  itemName: '',
  range: EMPTY_CALENDAR_RANGE,
};

export const MIN_SEARCH_LENGTH = 2;

export function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function toMovementQuery(filters: MovementFilters): MovementQuery {
  const query: MovementQuery = {};
  const search = filters.itemName.trim();

  if (search.length >= MIN_SEARCH_LENGTH) {
    query.search = search;
  }

  if (filters.range.from) {
    query.periodStart = filters.range.from;
  }

  if (filters.range.to) {
    query.periodEnd = filters.range.to;
  }

  return query;
}

export function hasActiveFilters(filters: MovementFilters): boolean {
  return (
    normalizeSearchTerm(filters.itemName) !== '' ||
    filters.range.from !== null ||
    filters.range.to !== null
  );
}

export function hasNarrowingFilters(filters: MovementFilters): boolean {
  const query = toMovementQuery(filters);

  return (
    query.search !== undefined ||
    query.periodStart !== undefined ||
    query.periodEnd !== undefined
  );
}

export function matchesFilters(
  movement: { itemName: string; occurredAt: string },
  filters: MovementFilters,
): boolean {
  const query = toMovementQuery(filters);

  if (
    query.search !== undefined &&
    !normalizeSearchTerm(movement.itemName).includes(
      normalizeSearchTerm(query.search),
    )
  ) {
    return false;
  }

  const day = toCalendarDate(movement.occurredAt);

  if (query.periodStart !== undefined && day < query.periodStart) {
    return false;
  }

  return !(query.periodEnd !== undefined && day > query.periodEnd);
}
