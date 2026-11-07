import ReactTestRenderer, { act } from 'react-test-renderer';

import { useRecentInvoices } from './useRecentInvoices';
import type { Invoice, InvoicePage } from '../domain/invoice.types';
import { fetchInvoices } from '../services/invoiceService';

const mockSession = jest.fn();

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: mockSession() }),
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
    hasOriginalFile: true,
  };
}

function pageOf(count: number): InvoicePage {
  return {
    items: Array.from({ length: count }, (_, index) => invoice(`${index}`)),
    hasMore: false,
  };
}

function renderRecent() {
  const result = {
    current: null as unknown as ReturnType<typeof useRecentInvoices>,
  };

  function TestHarness() {
    result.current = useRecentInvoices();
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(<TestHarness />);
  });

  return { result, renderer };
}

beforeEach(() => {
  fetchMock.mockReset();
  mockSession.mockReturnValue({ idToken: 'id-token' });
});

describe('useRecentInvoices', () => {
  it('asks for the first page with the session token', async () => {
    fetchMock.mockResolvedValue(pageOf(1));

    renderRecent();
    await act(async () => undefined);

    expect(fetchMock).toHaveBeenCalledWith('id-token');
  });

  it('keeps only the few most recent invoices', async () => {
    fetchMock.mockResolvedValue(pageOf(12));

    const { result } = renderRecent();
    await act(async () => undefined);

    expect(result.current.status).toBe('ready');
    expect(result.current.invoices).toHaveLength(5);
    expect(result.current.invoices[0].number).toBe('0');
  });

  it('fails when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const { result } = renderRecent();
    await act(async () => undefined);

    expect(result.current.status).toBe('failed');
  });

  it('does not ask without a session', async () => {
    mockSession.mockReturnValue(null);

    const { result } = renderRecent();
    await act(async () => undefined);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('loading');
  });

  it('ignores an answer that arrives after it was unmounted', async () => {
    let resolve!: (value: InvoicePage) => void;
    fetchMock.mockReturnValue(new Promise(done => (resolve = done)));

    const { result, renderer } = renderRecent();
    act(() => renderer.unmount());
    await act(async () => resolve(pageOf(1)));

    expect(result.current.status).toBe('loading');
  });
});
