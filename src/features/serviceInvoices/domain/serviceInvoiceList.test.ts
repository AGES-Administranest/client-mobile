import {
  filterInvoices,
  formatFileSize,
  formatInvoiceDate,
  matchesSearchTerm,
  mergeInvoiceCache,
  sortByIssueDateDesc,
} from './serviceInvoiceList';
import type { ServiceInvoiceSummary } from './serviceInvoiceRecord.types';

function invoice(
  overrides: Partial<ServiceInvoiceSummary> = {},
): ServiceInvoiceSummary {
  return {
    id: 'a',
    number: '000458',
    issueDate: '2026-04-22',
    amount: 100,
    clientId: 'c1',
    clientName: 'HospVet Sul',
    location: 'São Paulo, SP',
    hasFile: true,
    syncStatus: 'SYNCED',
    ...overrides,
  };
}

describe('sortByIssueDateDesc', () => {
  it('puts the most recent issue date first without touching the input', () => {
    const input = [
      invoice({ id: 'old', issueDate: '2026-01-10' }),
      invoice({ id: 'new', issueDate: '2026-04-22' }),
      invoice({ id: 'mid', issueDate: '2026-03-01' }),
    ];

    expect(sortByIssueDateDesc(input).map(item => item.id)).toEqual([
      'new',
      'mid',
      'old',
    ]);
    expect(input.map(item => item.id)).toEqual(['old', 'new', 'mid']);
  });

  it('keeps a stable order between notes of the same day', () => {
    const input = [invoice({ id: 'b' }), invoice({ id: 'a' })];

    expect(sortByIssueDateDesc(input).map(item => item.id)).toEqual(['a', 'b']);
  });
});

describe('matchesSearchTerm', () => {
  it.each([
    ['', true],
    ['hospvet', true],
    ['HOSPVÉT', true],
    ['clinica', false],
    ['22/04/2026', true],
    ['22/04', true],
    ['2204', true],
    ['23/04', false],
    ['1', false],
    ['000458', true],
  ])('term %j matches: %s', (term, expected) => {
    expect(matchesSearchTerm(invoice(), term)).toBe(expected);
  });
});

describe('filterInvoices', () => {
  const list = [
    invoice({ id: '1' }),
    invoice({ id: '2', syncStatus: 'PENDING', clientName: 'Pet Center' }),
    invoice({ id: '3', syncStatus: 'ERROR' }),
  ];

  it('returns everything for an empty filter', () => {
    expect(filterInvoices(list, { term: '', status: 'ALL' })).toHaveLength(3);
  });

  it('narrows by sync status', () => {
    expect(
      filterInvoices(list, { term: '', status: 'ERROR' }).map(i => i.id),
    ).toEqual(['3']);
  });

  it('combines status and term', () => {
    expect(
      filterInvoices(list, { term: 'pet', status: 'PENDING' }).map(i => i.id),
    ).toEqual(['2']);
    expect(filterInvoices(list, { term: 'pet', status: 'SYNCED' })).toEqual([]);
  });
});

describe('formatInvoiceDate', () => {
  it('writes the date as DD/MM/YYYY', () => {
    expect(formatInvoiceDate('2026-04-22')).toBe('22/04/2026');
  });

  it('gives back what it cannot read', () => {
    expect(formatInvoiceDate('soon')).toBe('soon');
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '1 KB'],
    [253952, '248 KB'],
    [1048576, '1 MB'],
    [1572864, '1,5 MB'],
  ])('%d bytes is %s', (bytes, expected) => {
    expect(formatFileSize(bytes, 'pt-BR')).toBe(expected);
  });
});

describe('mergeInvoiceCache', () => {
  const at = (id: string, issueDate: string) => invoice({ id, issueDate });

  it('is the page itself when the page holds every note', () => {
    const page = [at('n', '2026-04-22')];

    expect(mergeInvoiceCache([at('x', '2026-01-01')], page, 1)).toEqual(page);
  });

  it('keeps the older cached notes the short page does not reach', () => {
    const cached = [
      at('a', '2026-04-22'),
      at('b', '2026-03-01'),
      at('c', '2026-02-01'),
    ];
    const page = [at('n', '2026-05-01'), at('a', '2026-04-22')];

    expect(mergeInvoiceCache(cached, page, 3).map(i => i.id)).toEqual([
      'n',
      'a',
      'b',
      'c',
    ]);
  });

  it('drops a cached note newer than the page oldest that the page no longer has', () => {
    const cached = [at('gone', '2026-04-25'), at('b', '2026-03-01')];
    const page = [at('n', '2026-05-01'), at('a', '2026-04-22')];

    expect(mergeInvoiceCache(cached, page, 3).map(i => i.id)).toEqual([
      'n',
      'a',
      'b',
    ]);
  });
});
