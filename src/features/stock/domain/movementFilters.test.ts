import {
  EMPTY_MOVEMENT_FILTERS,
  hasActiveFilters,
  hasNarrowingFilters,
  matchesFilters,
  MIN_SEARCH_LENGTH,
  normalizeSearchTerm,
  toMovementQuery,
} from './movementFilters';

const NO_RANGE = { from: null, to: null };

function row(itemName: string, occurredAt: string) {
  return { itemName, occurredAt };
}

describe('normalizeSearchTerm', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeSearchTerm('Soro Fisiológico')).toBe('soro fisiologico');
  });

  it('trims the surrounding whitespace', () => {
    expect(normalizeSearchTerm('  Gaze  ')).toBe('gaze');
  });
});

describe('toMovementQuery', () => {
  it('sends nothing when no filter is set', () => {
    expect(toMovementQuery(EMPTY_MOVEMENT_FILTERS)).toEqual({});
  });

  it.each([['g'], [' g '], ['']])(
    'omits a search shorter than the minimum the backend accepts (%p)',
    itemName => {
      expect(
        toMovementQuery({ itemName, range: { from: null, to: null } }),
      ).toEqual({});
    },
  );

  it('sends a search once it reaches the minimum length', () => {
    expect(
      toMovementQuery({ itemName: 'ga', range: { from: null, to: null } }),
    ).toEqual({ search: 'ga' });
    expect('ga'.length).toBe(MIN_SEARCH_LENGTH);
  });

  it('keeps the accents the user typed, since the backend does the matching', () => {
    expect(
      toMovementQuery({
        itemName: 'fisiológico',
        range: { from: null, to: null },
      }),
    ).toEqual({ search: 'fisiológico' });
  });

  it('trims the search term', () => {
    expect(
      toMovementQuery({
        itemName: '  gaze  ',
        range: { from: null, to: null },
      }),
    ).toEqual({ search: 'gaze' });
  });

  it('sends only the start when the period is still half picked', () => {
    expect(
      toMovementQuery({
        itemName: '',
        range: { from: '2026-09-08', to: null },
      }),
    ).toEqual({ periodStart: '2026-09-08' });
  });

  it('sends both ends of a complete period', () => {
    expect(
      toMovementQuery({
        itemName: '',
        range: { from: '2026-09-08', to: '2026-09-10' },
      }),
    ).toEqual({ periodStart: '2026-09-08', periodEnd: '2026-09-10' });
  });

  it('combines the search and the period', () => {
    expect(
      toMovementQuery({
        itemName: 'gaze',
        range: { from: '2026-09-08', to: '2026-09-10' },
      }),
    ).toEqual({
      search: 'gaze',
      periodStart: '2026-09-08',
      periodEnd: '2026-09-10',
    });
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

describe('hasNarrowingFilters', () => {
  it('is false when nothing was typed or picked', () => {
    expect(hasNarrowingFilters(EMPTY_MOVEMENT_FILTERS)).toBe(false);
  });

  it('is false for a term the backend would ignore', () => {
    expect(hasNarrowingFilters({ itemName: 'g', range: NO_RANGE })).toBe(false);
  });

  it('is true once the term is long enough to be sent', () => {
    expect(hasNarrowingFilters({ itemName: 'ga', range: NO_RANGE })).toBe(true);
  });

  it('is true with a period picked', () => {
    expect(
      hasNarrowingFilters({
        itemName: '',
        range: { from: '2026-09-08', to: null },
      }),
    ).toBe(true);
  });
});

describe('matchesFilters', () => {
  const movement = row('Soro fisiológico 500ml', '2026-09-08T09:30:00.000Z');

  it('keeps everything when no filter is set', () => {
    expect(matchesFilters(movement, EMPTY_MOVEMENT_FILTERS)).toBe(true);
  });

  it('ignores accents and case, the way the list always did', () => {
    expect(
      matchesFilters(movement, { itemName: 'FISIOLOGICO', range: NO_RANGE }),
    ).toBe(true);
  });

  it('drops a row whose name does not match', () => {
    expect(matchesFilters(movement, { itemName: 'gaze', range: NO_RANGE })).toBe(
      false,
    );
  });

  it('keeps a row that would not even be sent as a search', () => {
    expect(matchesFilters(movement, { itemName: 'g', range: NO_RANGE })).toBe(
      true,
    );
  });

  it('drops a row before the start of the period', () => {
    expect(
      matchesFilters(movement, {
        itemName: '',
        range: { from: '2026-09-09', to: null },
      }),
    ).toBe(false);
  });

  it('drops a row after the end of the period', () => {
    expect(
      matchesFilters(movement, {
        itemName: '',
        range: { from: null, to: '2026-09-07' },
      }),
    ).toBe(false);
  });

  it('keeps a row on the last day of the period', () => {
    expect(
      matchesFilters(movement, {
        itemName: '',
        range: { from: '2026-09-08', to: '2026-09-08' },
      }),
    ).toBe(true);
  });
});
