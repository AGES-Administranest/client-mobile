import {
  EMPTY_MOVEMENT_FILTERS,
  filterMovements,
  hasActiveFilters,
  matchesItemName,
  matchesPeriod,
  normalizeSearchTerm,
} from './movementFilters';
import type { StockMovement } from './stockMovement';

function movement(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 'movement-1',
    itemName: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    type: 'outbound',
    source: 'appointment',
    quantity: 2,
    unitCost: 19.9,
    occurredAt: '2026-09-08T09:30:00',
    ...overrides,
  };
}

describe('normalizeSearchTerm', () => {
  it('strips accents so the search works without them', () => {
    expect(normalizeSearchTerm('Soro Fisiológico')).toBe('soro fisiologico');
  });

  it('trims and lowercases', () => {
    expect(normalizeSearchTerm('  Gaze  ')).toBe('gaze');
  });
});

describe('matchesItemName', () => {
  it('matches every movement when the term is empty', () => {
    expect(matchesItemName(movement(), '')).toBe(true);
    expect(matchesItemName(movement(), '   ')).toBe(true);
  });

  it('matches part of the name', () => {
    expect(matchesItemName(movement(), 'propo')).toBe(true);
  });

  it('ignores case', () => {
    expect(matchesItemName(movement(), 'PROPOFOL')).toBe(true);
  });

  it('ignores accents on both sides', () => {
    const soro = movement({ itemName: 'Soro fisiológico 500ml' });

    expect(matchesItemName(soro, 'fisiologico')).toBe(true);
    expect(matchesItemName(soro, 'FISIOLÓGICO')).toBe(true);
  });

  it('rejects a name that does not contain the term', () => {
    expect(matchesItemName(movement(), 'gaze')).toBe(false);
  });
});

describe('matchesPeriod', () => {
  it('accepts anything when no period is selected', () => {
    expect(matchesPeriod(movement(), { from: null, to: null })).toBe(true);
  });

  it('matches a movement inside the period', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };

    expect(matchesPeriod(movement(), range)).toBe(true);
  });

  it('includes movements on the first and last day of the period', () => {
    const range = { from: '2026-09-08', to: '2026-09-10' };

    expect(
      matchesPeriod(movement({ occurredAt: '2026-09-08T00:05:00' }), range),
    ).toBe(true);
    expect(
      matchesPeriod(movement({ occurredAt: '2026-09-10T23:55:00' }), range),
    ).toBe(true);
  });

  it('matches a single day selected as both start and end', () => {
    const range = { from: '2026-09-08', to: '2026-09-08' };

    expect(
      matchesPeriod(movement({ occurredAt: '2026-09-08T23:59:00' }), range),
    ).toBe(true);
    expect(
      matchesPeriod(movement({ occurredAt: '2026-09-09T00:01:00' }), range),
    ).toBe(false);
  });

  it('excludes movements outside the period', () => {
    const range = { from: '2026-09-01', to: '2026-09-05' };

    expect(matchesPeriod(movement(), range)).toBe(false);
  });
});

describe('filterMovements', () => {
  const propofol = movement({
    id: 'a',
    itemName: 'Propofol 10mg/ml 20ml',
    occurredAt: '2026-09-08T09:30:00',
  });
  const seringa = movement({
    id: 'b',
    itemName: 'Seringa 60ml (cx 30un)',
    occurredAt: '2026-09-05T14:00:00',
  });
  const soro = movement({
    id: 'c',
    itemName: 'Soro fisiológico 500ml',
    occurredAt: '2026-08-29T17:20:00',
  });
  const all = [propofol, seringa, soro];

  it('returns everything when no filter is set', () => {
    expect(filterMovements(all, EMPTY_MOVEMENT_FILTERS)).toEqual(all);
  });

  it('filters by item name alone', () => {
    const result = filterMovements(all, {
      itemName: 'seringa',
      range: { from: null, to: null },
    });

    expect(result.map(item => item.id)).toEqual(['b']);
  });

  it('filters by period alone', () => {
    const result = filterMovements(all, {
      itemName: '',
      range: { from: '2026-09-01', to: '2026-09-30' },
    });

    expect(result.map(item => item.id)).toEqual(['a', 'b']);
  });

  it('combines both filters', () => {
    const result = filterMovements(all, {
      itemName: 'propofol',
      range: { from: '2026-09-08', to: '2026-09-08' },
    });

    expect(result.map(item => item.id)).toEqual(['a']);
  });

  it('returns nothing when the two filters do not overlap', () => {
    const result = filterMovements(all, {
      itemName: 'propofol',
      range: { from: '2026-08-01', to: '2026-08-31' },
    });

    expect(result).toEqual([]);
  });

  it('keeps the order it received', () => {
    const result = filterMovements(all, {
      itemName: '',
      range: { from: '2026-08-01', to: '2026-09-30' },
    });

    expect(result.map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the received list', () => {
    const movements = [...all];

    filterMovements(movements, {
      itemName: 'gaze',
      range: EMPTY_MOVEMENT_FILTERS.range,
    });

    expect(movements).toHaveLength(3);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filters', () => {
    expect(hasActiveFilters(EMPTY_MOVEMENT_FILTERS)).toBe(false);
  });

  it('is false when the search term is only whitespace', () => {
    expect(
      hasActiveFilters({ itemName: '   ', range: { from: null, to: null } }),
    ).toBe(false);
  });

  it('is true with a search term', () => {
    expect(
      hasActiveFilters({ itemName: 'gaze', range: { from: null, to: null } }),
    ).toBe(true);
  });

  it('is true with only the start of a period picked', () => {
    expect(
      hasActiveFilters({
        itemName: '',
        range: { from: '2026-09-08', to: null },
      }),
    ).toBe(true);
  });
});
