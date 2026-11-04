import ReactTestRenderer, { act } from 'react-test-renderer';

import { useRecentInvoices } from './useRecentInvoices';
import type { ReportInvoice } from '../domain/reportInvoice';
import { fetchReportInvoices } from '../services/reportInvoiceService';

const mockSession = jest.fn();

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: mockSession() }),
}));

jest.mock('../services/reportInvoiceService', () => ({
  fetchReportInvoices: jest.fn(),
}));

const fetchMock = fetchReportInvoices as jest.MockedFunction<
  typeof fetchReportInvoices
>;

function invoice(id: string): ReportInvoice {
  return {
    id,
    issueDate: '2026-08-10',
    takerName: 'Tomador',
    hasOriginalFile: true,
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
  it('asks for the few most recent invoices with the session token', async () => {
    fetchMock.mockResolvedValue([invoice('a')]);

    renderRecent();
    await act(async () => undefined);

    expect(fetchMock).toHaveBeenCalledWith('id-token', 5);
  });

  it('has the invoices the service returns', async () => {
    fetchMock.mockResolvedValue([invoice('a'), invoice('b')]);

    const { result } = renderRecent();
    await act(async () => undefined);

    expect(result.current.status).toBe('ready');
    expect(result.current.invoices.map(item => item.id)).toEqual(['a', 'b']);
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
    let resolve!: (value: ReportInvoice[]) => void;
    fetchMock.mockReturnValue(new Promise(done => (resolve = done)));

    const { result, renderer } = renderRecent();
    act(() => renderer.unmount());
    await act(async () => resolve([invoice('a')]));

    expect(result.current.status).toBe('loading');
  });
});
