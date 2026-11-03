import { fetchInvoices, INVOICES_PAGE_SIZE } from './invoiceService';
import { STUB_INVOICES } from './invoiceStub';

const ID_TOKEN = 'id-token';

describe('fetchInvoices', () => {
  it('returns the first page with the most recent invoice first', async () => {
    const page = await fetchInvoices(ID_TOKEN);

    expect(page.items).toHaveLength(INVOICES_PAGE_SIZE);
    expect(page.items[0].number).toBe('000458');
    expect(page.hasMore).toBe(true);
  });

  it('keeps the order across pages with no repeated invoice', async () => {
    const first = await fetchInvoices(ID_TOKEN, {}, 1);
    const second = await fetchInvoices(ID_TOKEN, {}, 2);
    const dates = [...first.items, ...second.items].map(item => item.issuedAt);

    expect(dates).toEqual([...dates].sort().reverse());
    expect(
      new Set([...first.items, ...second.items].map(item => item.id)).size,
    ).toBe(INVOICES_PAGE_SIZE * 2);
  });

  it('flags the last page as having no more', async () => {
    const last = Math.ceil(STUB_INVOICES.length / INVOICES_PAGE_SIZE);
    const page = await fetchInvoices(ID_TOKEN, {}, last);

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.hasMore).toBe(false);
  });

  it('returns an empty page past the end', async () => {
    const page = await fetchInvoices(ID_TOKEN, {}, 99);

    expect(page).toEqual({ items: [], hasMore: false });
  });

  it('filters by the taker name', async () => {
    const page = await fetchInvoices(ID_TOKEN, { search: 'boa vida' });

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every(item => item.takerName.includes('Boa Vida'))).toBe(
      true,
    );
  });

  it('combines the search with the period', async () => {
    const page = await fetchInvoices(ID_TOKEN, {
      search: 'boa vida',
      issuedFrom: '2026-07-01',
      issuedTo: '2026-08-31',
    });

    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every(
        item =>
          item.takerName.includes('Boa Vida') &&
          item.issuedAt >= '2026-07-01' &&
          item.issuedAt <= '2026-08-31T23:59:59',
      ),
    ).toBe(true);
  });

  it('returns nothing when the filters match no invoice', async () => {
    const page = await fetchInvoices(ID_TOKEN, { search: 'zzzz' });

    expect(page).toEqual({ items: [], hasMore: false });
  });
});
