import { formatIssueDate, toServiceInvoice } from './serviceInvoice';

describe('formatIssueDate', () => {
  it.each([
    ['2026-04-22', '22/04/2026'],
    ['2026-01-05', '05/01/2026'],
    ['2026-12-31T00:00:00.000Z', '31/12/2026'],
    ['', ''],
    ['not-a-date', ''],
    ['22/04/2026', ''],
  ])('formats %p as %p', (input, expected) => {
    expect(formatIssueDate(input)).toBe(expected);
  });
});

describe('toServiceInvoice', () => {
  const base = {
    id: 'invoice-1',
    status: 'CONFIRMED' as const,
    createdAt: '2026-10-13T12:00:00.000Z',
  };

  it('maps the issue date, the taker and the uploaded file', () => {
    expect(
      toServiceInvoice({
        ...base,
        issueDate: '2026-10-13',
        takerName: 'HospVet Sul',
        uploadedAt: '2026-10-13T12:01:00.000Z',
      }),
    ).toEqual({
      id: 'invoice-1',
      issueDate: '2026-10-13',
      takerName: 'HospVet Sul',
      hasOriginalFile: true,
    });
  });

  it('has no original file while the upload never arrived', () => {
    expect(toServiceInvoice(base).hasOriginalFile).toBe(false);
  });

  it('keeps an absent issue date and taker as null', () => {
    const invoice = toServiceInvoice(base);

    expect(invoice.issueDate).toBeNull();
    expect(invoice.takerName).toBeNull();
  });
});
