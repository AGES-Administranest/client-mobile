import {
  formatIssueDate,
  sortByIssueDateDesc,
  type ServiceInvoice,
} from './serviceInvoice';

function invoice(id: string, issueDate: string | null): ServiceInvoice {
  return { id, issueDate, clientName: 'HospVet Sul', hasOriginalFile: true };
}

describe('formatIssueDate', () => {
  it.each([
    ['2026-04-22', '22/04/2026'],
    ['2026-01-05', '05/01/2026'],
    ['2026-12-31T00:00:00.000Z', '31/12/2026'],
    ['', ''],
    ['not-a-date', ''],
  ])('formats %p as %p', (input, expected) => {
    expect(formatIssueDate(input)).toBe(expected);
  });
});

describe('sortByIssueDateDesc', () => {
  it('puts the most recent issue date first', () => {
    const sorted = sortByIssueDateDesc([
      invoice('old', '2026-01-10'),
      invoice('new', '2026-08-18'),
      invoice('mid', '2026-04-22'),
    ]);

    expect(sorted.map(item => item.id)).toEqual(['new', 'mid', 'old']);
  });

  it('puts an invoice without an issue date last', () => {
    const sorted = sortByIssueDateDesc([
      invoice('none', null),
      invoice('dated', '2026-04-22'),
    ]);

    expect(sorted.map(item => item.id)).toEqual(['dated', 'none']);
  });

  it('does not change the list it receives', () => {
    const input = [invoice('a', '2026-01-01'), invoice('b', '2026-02-01')];

    sortByIssueDateDesc(input);

    expect(input.map(item => item.id)).toEqual(['a', 'b']);
  });
});
