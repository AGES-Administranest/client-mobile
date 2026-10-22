import { fetchRecentServiceInvoices } from './serviceInvoiceService';

describe('fetchRecentServiceInvoices', () => {
  it.each([1, 2])('returns at most %p invoices', async limit => {
    const invoices = await fetchRecentServiceInvoices('id-token', limit);

    expect(invoices).toHaveLength(limit);
  });
});
