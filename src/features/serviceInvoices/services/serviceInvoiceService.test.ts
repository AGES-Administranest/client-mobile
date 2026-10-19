import { fetchRecentServiceInvoices } from './serviceInvoiceService';

describe('fetchRecentServiceInvoices', () => {
  it('answers newest first', async () => {
    const invoices = await fetchRecentServiceInvoices('id-token', 10);

    const dates = invoices.map(invoice => invoice.issueDate ?? '');
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it.each([1, 2])('returns at most %p invoices', async limit => {
    const invoices = await fetchRecentServiceInvoices('id-token', limit);

    expect(invoices).toHaveLength(limit);
  });
});
