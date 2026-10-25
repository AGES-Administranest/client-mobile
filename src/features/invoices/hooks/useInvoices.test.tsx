import ReactTestRenderer, { act } from 'react-test-renderer';

import { useInvoices } from './useInvoices';
import type { Invoice, InvoicePage } from '../domain/invoice.types';
import { EMPTY_INVOICE_FILTERS } from '../domain/invoiceFilters';
import { fetchInvoices } from '../services/invoiceService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'id-token' } }),
}));

jest.mock('../services/invoiceService', () => ({
  fetchInvoices: jest.fn(),
}));

const fetchMock = fetchInvoices as jest.MockedFunction<typeof fetchInvoices>;

function invoice(number: string): Invoice {
  return {
    id: `invoice-${number}`,
    number,
    kind: 'SERVICE',
    issuerName: 'Emitente',
    takerName: 'Tomador',
    takerCnpj: '12.345.678/0001-90',
    amount: 100,
    issuedAt: '2026-08-10T12:00:00.000Z',
    syncStatus: 'SYNCED',
  };
}

function pageOf(numbers: string[], hasMore: boolean): InvoicePage {
  return { items: numbers.map(invoice), hasMore };
}

function numbersOf(list: Invoice[]) {
  return list.map(item => item.number);
}

type Filters = Parameters<typeof useInvoices>[0];

function renderInvoices(initial: Filters = EMPTY_INVOICE_FILTERS) {
  const result = {
    current: null as unknown as ReturnType<typeof useInvoices>,
  };

  function TestHarness({ filters }: { filters: Filters }) {
    result.current = useInvoices(filters, 300);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(<TestHarness filters={initial} />);
  });

  return {
    result,
    rerender: (filters: Filters) =>
      act(() => {
        renderer.update(<TestHarness filters={filters} />);
      }),
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useInvoices', () => {
  it('loads the first page', async () => {
    fetchMock.mockResolvedValueOnce(pageOf(['2', '1'], true));

    const { result } = renderInvoices();

    expect(result.current.isLoading).toBe(true);
    await flush();

    expect(numbersOf(result.current.invoices)).toEqual(['2', '1']);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasMore).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('id-token', {}, 1);
  });

  it('appends the next page without repeating an invoice', async () => {
    fetchMock
      .mockResolvedValueOnce(pageOf(['3', '2'], true))
      .mockResolvedValueOnce(pageOf(['2', '1'], false));

    const { result } = renderInvoices();
    await flush();

    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);
    await flush();

    expect(numbersOf(result.current.invoices)).toEqual(['3', '2', '1']);
    expect(result.current.hasMore).toBe(false);
    expect(fetchMock).toHaveBeenLastCalledWith('id-token', {}, 2);
  });

  it('asks for one page at a time', async () => {
    fetchMock
      .mockResolvedValueOnce(pageOf(['2'], true))
      .mockResolvedValueOnce(pageOf(['1'], false));

    const { result } = renderInvoices();
    await flush();

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does nothing on the last page', async () => {
    fetchMock.mockResolvedValueOnce(pageOf(['1'], false));

    const { result } = renderInvoices();
    await flush();
    act(() => result.current.loadMore());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the list and retries the same page when loading more fails', async () => {
    fetchMock
      .mockResolvedValueOnce(pageOf(['2'], true))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pageOf(['1'], false));

    const { result } = renderInvoices();
    await flush();

    act(() => result.current.loadMore());
    await flush();

    expect(result.current.loadMoreFailed).toBe(true);
    expect(numbersOf(result.current.invoices)).toEqual(['2']);

    act(() => result.current.loadMore());
    await flush();

    expect(result.current.loadMoreFailed).toBe(false);
    expect(numbersOf(result.current.invoices)).toEqual(['2', '1']);
    expect(fetchMock).toHaveBeenLastCalledWith('id-token', {}, 2);
  });

  it('reports a failure on the first page and reloads on retry', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pageOf(['1'], false));

    const { result } = renderInvoices();
    await flush();

    expect(result.current.hasError).toBe(true);
    expect(result.current.invoices).toEqual([]);

    act(() => result.current.retry());
    await flush();

    expect(result.current.hasError).toBe(false);
    expect(numbersOf(result.current.invoices)).toEqual(['1']);
  });

  it('restarts from the first page when the period changes', async () => {
    fetchMock
      .mockResolvedValueOnce(pageOf(['3'], true))
      .mockResolvedValueOnce(pageOf(['1'], false));

    const { result, rerender } = renderInvoices();
    await flush();

    rerender({
      search: '',
      range: { from: '2026-08-01', to: '2026-08-31' },
    });
    await flush();

    expect(fetchMock).toHaveBeenLastCalledWith(
      'id-token',
      { issuedFrom: '2026-08-01', issuedTo: '2026-08-31' },
      1,
    );
    expect(numbersOf(result.current.invoices)).toEqual(['1']);
  });

  it('waits for the typing to pause before searching', async () => {
    fetchMock.mockResolvedValue(pageOf(['1'], false));

    const { rerender } = renderInvoices();
    await flush();

    rerender({ search: 'vi', range: EMPTY_INVOICE_FILTERS.range });
    rerender({ search: 'vid', range: EMPTY_INVOICE_FILTERS.range });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'id-token',
      { search: 'vid' },
      1,
    );
  });

  it('does not reload for a search below the minimum', async () => {
    fetchMock.mockResolvedValue(pageOf(['1'], false));

    const { rerender } = renderInvoices();
    await flush();

    rerender({ search: 'v', range: EMPTY_INVOICE_FILTERS.range });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response from before the filters changed', async () => {
    let resolveStale!: (page: InvoicePage) => void;

    fetchMock
      .mockImplementationOnce(
        () => new Promise<InvoicePage>(resolve => (resolveStale = resolve)),
      )
      .mockResolvedValueOnce(pageOf(['new'], false));

    const { result, rerender } = renderInvoices();

    rerender({ search: '', range: { from: '2026-08-01', to: null } });
    await flush();

    await act(async () => {
      resolveStale(pageOf(['stale'], false));
      await Promise.resolve();
    });

    expect(numbersOf(result.current.invoices)).toEqual(['new']);
  });
});
