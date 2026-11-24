import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react-test-renderer';

import type { ServiceInvoiceSummary } from 'features/serviceInvoices/domain/serviceInvoiceRecord.types';
import { useServiceInvoices } from 'features/serviceInvoices/hooks/useServiceInvoices';
import {
  loadServiceInvoiceCache,
  notifyOfflineServiceInvoicesChanged,
  queueInvoiceDeletion,
  saveServiceInvoiceCache,
  saveServiceInvoiceOutbox,
} from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { fetchServiceInvoices } from 'features/serviceInvoices/services/serviceInvoiceRecordService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' } as { id: string } | null,
};

// One object, as the real hook keeps it between renders.
const mockNames = { 'client-1': 'VetSul' };
jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/clients', () => ({ useClientNames: () => mockNames }));
jest.mock(
  'features/serviceInvoices/services/serviceInvoiceRecordService',
  () => ({ fetchServiceInvoices: jest.fn() }),
);

const fetchPage = jest.mocked(fetchServiceInvoices);
const NETWORK_DOWN = new TypeError('Network request failed');

const note = (
  id: string,
  issueDate: string,
  overrides: Partial<ServiceInvoiceSummary> = {},
): ServiceInvoiceSummary => ({
  id,
  number: id,
  issueDate,
  amount: 100,
  clientId: 'client-1',
  clientName: 'VetSul',
  location: null,
  hasFile: true,
  syncStatus: 'SYNCED',
  ...overrides,
});

const A = note('a', '2026-10-20');
const B = note('b', '2026-10-10');
const C = note('c', '2026-10-01');

const mount = (search?: string) =>
  renderHook(
    (props: { search?: string }) =>
      useServiceInvoices({ pageSize: 2, ...props }),
    { search },
  );

type Hook = Awaited<ReturnType<typeof mount>>;
const idsOf = (hook: Hook) => hook.current.items.map(item => item.id);

beforeEach(async () => {
  fetchPage.mockReset();
  mockAuth.session = { idToken: 'token' };
  mockAuth.account = { id: 'user-1' };
  await AsyncStorage.clear();
});

describe('useServiceInvoices', () => {
  it('lists the first page and saves it for later', async () => {
    fetchPage.mockResolvedValue({ items: [A, B], total: 3 });

    const hook = await mount();

    expect(fetchPage).toHaveBeenCalledWith('token', {
      page: 1,
      pageSize: 2,
      search: undefined,
    });
    expect(idsOf(hook)).toEqual(['a', 'b']);
    expect(hook.current).toMatchObject({
      status: 'ready',
      isOffline: false,
      hasMore: true,
    });
    await expect(loadServiceInvoiceCache('user-1')).resolves.toEqual([A, B]);
  });

  it('does not save what a search found', async () => {
    fetchPage.mockResolvedValue({ items: [A], total: 1 });

    await mount('VetSul');

    await expect(loadServiceInvoiceCache('user-1')).resolves.toEqual([]);
  });

  it('waits for a session', async () => {
    mockAuth.session = null;
    mockAuth.account = null;

    const hook = await mount();

    expect(hook.current.status).toBe('loading');
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('adds the next page without repeating a note', async () => {
    fetchPage
      .mockResolvedValueOnce({ items: [A, B], total: 3 })
      .mockResolvedValueOnce({ items: [B, C], total: 3 });
    const hook = await mount();

    await act(async () => hook.current.loadMore());

    expect(fetchPage).toHaveBeenLastCalledWith(
      'token',
      expect.objectContaining({ page: 2 }),
    );
    expect(idsOf(hook)).toEqual(['a', 'b', 'c']);
    expect(hook.current.hasMore).toBe(false);

    await act(async () => hook.current.loadMore());
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops paging when the next page cannot be read', async () => {
    fetchPage
      .mockResolvedValueOnce({ items: [A, B], total: 3 })
      .mockRejectedValueOnce(NETWORK_DOWN);
    const hook = await mount();

    await act(async () => hook.current.loadMore());

    expect(idsOf(hook)).toEqual(['a', 'b']);
    expect(hook.current).toMatchObject({
      isOffline: true,
      hasMore: false,
      isLoadingMore: false,
    });
  });

  it('drops a next page that a reload left behind', async () => {
    let answer!: () => void;
    fetchPage
      .mockResolvedValueOnce({ items: [A, B], total: 3 })
      .mockReturnValueOnce(
        new Promise(resolve => {
          answer = () => resolve({ items: [C], total: 3 });
        }),
      )
      .mockResolvedValueOnce({ items: [A], total: 1 });
    const hook = await mount();

    await act(async () => {
      hook.current.loadMore();
    });
    await act(async () => hook.current.reload());
    await act(async () => answer());

    expect(idsOf(hook)).toEqual(['a']);
  });

  describe('without a connection', () => {
    beforeEach(() => {
      fetchPage.mockRejectedValue(NETWORK_DOWN);
    });

    it('shows the notes saved earlier', async () => {
      await saveServiceInvoiceCache('user-1', [A, B]);

      const hook = await mount();

      expect(idsOf(hook)).toEqual(['a', 'b']);
      expect(hook.current).toMatchObject({
        status: 'ready',
        isOffline: true,
        hasMore: false,
      });
    });

    it('searches among the notes saved earlier', async () => {
      await saveServiceInvoiceCache('user-1', [
        A,
        note('x', '2026-10-02', { clientName: 'HospVet' }),
      ]);

      expect(idsOf(await mount('hosp'))).toEqual(['x']);
    });

    it('fails when nothing was saved', async () => {
      expect((await mount()).current).toMatchObject({
        status: 'error',
        isOffline: true,
        items: [],
      });
    });
  });

  it('does not pass saved notes for an answer the server refused', async () => {
    await saveServiceInvoiceCache('user-1', [A]);
    fetchPage.mockRejectedValue(new ApiError('broke', null, 500));

    expect((await mount()).current).toMatchObject({
      status: 'error',
      isOffline: false,
      items: [],
    });
  });

  it('ignores the answer of a search that was replaced', async () => {
    let answerOld!: () => void;
    fetchPage
      .mockReturnValueOnce(
        new Promise(resolve => {
          answerOld = () => resolve({ items: [C], total: 1 });
        }),
      )
      .mockResolvedValueOnce({ items: [A], total: 1 });
    const hook = await mount('Vet');
    await hook.rerender({ search: 'VetSul' });

    await act(async () => answerOld());

    expect(idsOf(hook)).toEqual(['a']);
  });

  it('mixes the notes in the queue and hides the ones being deleted', async () => {
    fetchPage.mockResolvedValue({ items: [A, B], total: 2 });
    const hook = await mount();

    await act(async () => {
      await saveServiceInvoiceOutbox('user-1', [
        {
          id: 'queued',
          issueDate: '2026-10-15',
          amount: 50,
          clientId: 'client-1',
          file: {
            name: 'n.pdf',
            mimeType: 'application/pdf',
            bytesSize: 1,
            hash: 'h',
          },
          createdAt: '2026-10-15T10:00:00.000Z',
        },
      ]);
      await queueInvoiceDeletion('user-1', 'a');
      notifyOfflineServiceInvoicesChanged();
    });

    expect(idsOf(hook)).toEqual(['queued', 'b']);
    expect(hook.current.items[0]).toMatchObject({
      clientName: 'VetSul',
      syncStatus: 'PENDING',
    });
  });

  it('lists the server notes when the queue cannot be read', async () => {
    fetchPage.mockResolvedValue({ items: [A], total: 1 });
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('broke'));

    expect(idsOf(await mount())).toEqual(['a']);
  });
});
