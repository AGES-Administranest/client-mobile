import { fetchInvoices } from './invoiceService';

describe('fetchInvoices', () => {
  it('returns an empty page until the endpoint exists', async () => {
    await expect(fetchInvoices('id-token')).resolves.toEqual({
      items: [],
      hasMore: false,
      total: 0,
    });
  });
});
