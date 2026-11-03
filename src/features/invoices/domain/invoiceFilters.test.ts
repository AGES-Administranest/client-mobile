import {
  EMPTY_INVOICE_FILTERS,
  hasActiveFilters,
  isRangeInverted,
  matchesFilters,
  MIN_SEARCH_LENGTH,
  toInvoiceQuery,
} from './invoiceFilters';

const NO_RANGE = { from: null, to: null };

describe('toInvoiceQuery', () => {
  it('sends nothing when no filter is set', () => {
    expect(toInvoiceQuery(EMPTY_INVOICE_FILTERS)).toEqual({});
  });

  it.each([[''], ['a'], [' a '], ['   ']])(
    'omits a search shorter than the minimum (%p)',
    search => {
      expect(toInvoiceQuery({ search, range: NO_RANGE })).toEqual({});
    },
  );

  it('sends the search right at the minimum length', () => {
    expect(toInvoiceQuery({ search: 'ab', range: NO_RANGE })).toEqual({
      search: 'ab',
    });
    expect('ab'.length).toBe(MIN_SEARCH_LENGTH);
  });

  it('trims the search before measuring and sending it', () => {
    expect(toInvoiceQuery({ search: '  pet  ', range: NO_RANGE })).toEqual({
      search: 'pet',
    });
  });

  it('keeps the accents the user typed', () => {
    expect(toInvoiceQuery({ search: 'Clínica', range: NO_RANGE })).toEqual({
      search: 'Clínica',
    });
  });

  it('sends only the start while the period is half picked', () => {
    expect(
      toInvoiceQuery({
        search: '',
        range: { from: '2026-08-01', to: null },
      }),
    ).toEqual({ issuedFrom: '2026-08-01' });
  });

  it('sends a complete period', () => {
    expect(
      toInvoiceQuery({
        search: '',
        range: { from: '2026-08-01', to: '2026-08-31' },
      }),
    ).toEqual({ issuedFrom: '2026-08-01', issuedTo: '2026-08-31' });
  });

  it('accepts a period that starts and ends on the same day', () => {
    expect(
      toInvoiceQuery({
        search: '',
        range: { from: '2026-08-10', to: '2026-08-10' },
      }),
    ).toEqual({ issuedFrom: '2026-08-10', issuedTo: '2026-08-10' });
  });

  it('combines the search with the period', () => {
    expect(
      toInvoiceQuery({
        search: 'vida',
        range: { from: '2026-08-01', to: '2026-08-31' },
      }),
    ).toEqual({
      search: 'vida',
      issuedFrom: '2026-08-01',
      issuedTo: '2026-08-31',
    });
  });

  it('keeps the search but drops an inverted period', () => {
    expect(
      toInvoiceQuery({
        search: 'vida',
        range: { from: '2026-08-31', to: '2026-08-01' },
      }),
    ).toEqual({ search: 'vida' });
  });
});

describe('isRangeInverted', () => {
  it.each([
    [{ from: '2026-08-31', to: '2026-08-01' }, true],
    [{ from: '2026-08-01', to: '2026-08-31' }, false],
    [{ from: '2026-08-10', to: '2026-08-10' }, false],
    [{ from: '2026-08-10', to: null }, false],
    [{ from: null, to: '2026-08-10' }, false],
    [NO_RANGE, false],
  ])('range %j -> %p', (range, expected) => {
    expect(isRangeInverted(range)).toBe(expected);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filters, so there is nothing to clear', () => {
    expect(hasActiveFilters(EMPTY_INVOICE_FILTERS)).toBe(false);
  });

  it('is false for a search of blanks', () => {
    expect(hasActiveFilters({ search: '   ', range: NO_RANGE })).toBe(false);
  });

  it.each([
    [{ search: 'a', range: NO_RANGE }],
    [{ search: '', range: { from: '2026-08-01', to: null } }],
    [{ search: '', range: { from: null, to: '2026-08-01' } }],
  ])(
    'is true when anything is set, even below the search minimum (%j)',
    filters => {
      expect(hasActiveFilters(filters)).toBe(true);
    },
  );
});

const INVOICE = {
  number: '000458',
  takerName: 'Clínica Veterinária Boa Vida',
  takerCnpj: '12.345.678/0001-90',
  issuedAt: '2026-08-10T12:00:00',
};

function withSearch(search: string, from: string | null = null, to = null) {
  return { search, range: { from, to } };
}

describe('matchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(matchesFilters(INVOICE, EMPTY_INVOICE_FILTERS)).toBe(true);
  });

  it.each([
    ['boa vida'],
    ['CLINICA'],
    ['veterinária'],
    ['458'],
    ['000458'],
    ['12.345.678/0001-90'],
    ['12345678000190'],
    ['0001-90'],
  ])('finds the invoice by name, number or CNPJ (%p)', search => {
    expect(matchesFilters(INVOICE, withSearch(search))).toBe(true);
  });

  it.each([['zzz'], ['999999'], ['98.765']])(
    'rejects a search that matches nothing (%p)',
    search => {
      expect(matchesFilters(INVOICE, withSearch(search))).toBe(false);
    },
  );

  it('does not search below the minimum, so every invoice stays', () => {
    expect(matchesFilters(INVOICE, withSearch('z'))).toBe(true);
  });

  it('does not match a CNPJ by a single stray digit', () => {
    expect(matchesFilters(INVOICE, withSearch('a9'))).toBe(false);
  });

  it('keeps the invoices issued on the first and last day of the period', () => {
    const range = { from: '2026-08-10', to: '2026-08-10' };

    expect(matchesFilters(INVOICE, { search: '', range })).toBe(true);
  });

  it('drops the invoices outside the period', () => {
    const range = { from: '2026-08-11', to: '2026-08-31' };

    expect(matchesFilters(INVOICE, { search: '', range })).toBe(false);
  });

  it('needs both the search and the period to match', () => {
    const range = { from: '2026-08-11', to: '2026-08-31' };

    expect(matchesFilters(INVOICE, { search: 'boa vida', range })).toBe(false);
  });
});
