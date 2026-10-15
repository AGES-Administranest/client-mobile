import type { FinancialEntry } from './financialEntry';
import {
  STATEMENT_PAGE_SIZE,
  appendStatementPage,
  currentPeriod,
  formatSignedAmount,
  formatStatementDate,
  isAutomaticEntry,
  isLastStatementPage,
  toStatementQuery,
} from './statement';

const AUGUST = { month: 8, year: 2026 };

function entry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: 'entry-1',
    nature: 'EXPENSE',
    description: 'Combustível',
    category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
    scope: 'PROFESSIONAL',
    amount: 180,
    accrualDate: '2026-08-09T12:00:00.000Z',
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
    ...overrides,
  };
}

const normalize = (value: string) => value.replace(/ /g, ' ');

describe('currentPeriod', () => {
  it.each([
    ['2026-01-01T00:00:00', { month: 1, year: 2026 }],
    ['2026-08-31T23:59:59', { month: 8, year: 2026 }],
    ['2026-12-15T10:00:00', { month: 12, year: 2026 }],
  ])('%s is in the month shown on the device', (date, period) => {
    expect(currentPeriod(new Date(date))).toEqual(period);
  });
});

describe('toStatementQuery', () => {
  it('asks for the month, the page and the page size', () => {
    const query = new URLSearchParams(
      toStatementQuery({ period: AUGUST, scope: 'all' }, 1),
    );

    expect(Object.fromEntries(query)).toEqual({
      month: '8',
      year: '2026',
      page: '1',
      limit: String(STATEMENT_PAGE_SIZE),
    });
  });

  it.each([
    ['PROFESSIONAL', 'PROFESSIONAL'],
    ['PERSONAL', 'PERSONAL'],
  ] as const)('sends the %s scope', (scope, sent) => {
    const query = new URLSearchParams(
      toStatementQuery({ period: AUGUST, scope }, 2),
    );

    expect(query.get('scope')).toBe(sent);
    expect(query.get('page')).toBe('2');
  });

  it('sends no scope for "all"', () => {
    const query = new URLSearchParams(
      toStatementQuery({ period: AUGUST, scope: 'all' }, 1),
    );

    expect(query.has('scope')).toBe(false);
  });
});

describe('isLastStatementPage', () => {
  it.each([
    [0, true],
    [STATEMENT_PAGE_SIZE - 1, true],
    [STATEMENT_PAGE_SIZE, false],
  ])('a page with %i entries: last = %s', (length, last) => {
    expect(isLastStatementPage(new Array(length).fill(null))).toBe(last);
  });
});

describe('appendStatementPage', () => {
  it('keeps the order and drops an entry the earlier pages already have', () => {
    const first = [entry({ id: 'a' }), entry({ id: 'b' })];
    const next = [entry({ id: 'b' }), entry({ id: 'c' })];

    expect(appendStatementPage(first, next).map(e => e.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('does not change the pages it received', () => {
    const first = [entry({ id: 'a' })];

    appendStatementPage(first, [entry({ id: 'b' })]);

    expect(first).toHaveLength(1);
  });
});

describe('isAutomaticEntry', () => {
  it.each([
    ['MANUAL', false],
    ['APPOINTMENT', true],
    ['SERVICE_INVOICE', true],
    ['PURCHASE_INVOICE', true],
    ['TRIP', true],
  ] as const)('%s → %s', (source, automatic) => {
    expect(isAutomaticEntry({ source })).toBe(automatic);
  });
});

describe('formatSignedAmount', () => {
  it.each([
    ['INCOME', 620, '+R$ 620'],
    ['EXPENSE', 145, '–R$ 145'],
    ['INCOME', 1400, '+R$ 1.400'],
    ['EXPENSE', 189.08, '–R$ 189,08'],
    ['EXPENSE', 0.5, '–R$ 0,50'],
  ] as const)('%s of %d reads %s', (nature, amount, expected) => {
    expect(normalize(formatSignedAmount({ nature, amount }, 'pt-BR'))).toBe(
      expected,
    );
  });

  it('follows the locale', () => {
    expect(
      normalize(
        formatSignedAmount({ nature: 'INCOME', amount: 1400 }, 'en-US'),
      ),
    ).toBe('+R$1,400');
  });
});

describe('formatStatementDate', () => {
  it('shows the day and the short month', () => {
    expect(formatStatementDate('2026-08-17T12:00:00.000Z', 'pt-BR')).toBe(
      '17 ago',
    );
  });
});
