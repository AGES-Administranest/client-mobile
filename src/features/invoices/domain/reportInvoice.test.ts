import { formatReportDate, toReportInvoice } from './reportInvoice';

describe('toReportInvoice', () => {
  it('maps the note the backend answers', () => {
    expect(
      toReportInvoice({
        id: 'invoice-1',
        issueDate: '2026-10-13',
        takerName: 'HospVet Sul',
        hasFile: true,
      }),
    ).toEqual({
      id: 'invoice-1',
      issueDate: '2026-10-13',
      takerName: 'HospVet Sul',
      hasOriginalFile: true,
    });
  });

  it('has no original file when the backend says so', () => {
    expect(
      toReportInvoice({
        id: 'invoice-1',
        issueDate: '2026-10-13',
        takerName: 'HospVet Sul',
        hasFile: false,
      }).hasOriginalFile,
    ).toBe(false);
  });
});

describe('formatReportDate', () => {
  it.each([
    ['2026-04-22', '22/04/2026'],
    ['2026-01-05', '05/01/2026'],
    ['2026-12-31T00:00:00.000Z', '31/12/2026'],
    ['', ''],
    ['not-a-date', ''],
    ['22/04/2026', ''],
  ])('formats %p as %p in pt-BR', (input, expected) => {
    expect(formatReportDate(input, 'pt-BR')).toBe(expected);
  });

  it('follows the locale', () => {
    expect(formatReportDate('2026-04-22', 'en-US')).toBe('4/22/26');
  });
});
