import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react-test-renderer';

import type { ServiceInvoiceRecord } from 'features/serviceInvoices/domain/serviceInvoiceRecord.types';
import { useServiceInvoiceRecord } from 'features/serviceInvoices/hooks/useServiceInvoiceRecord';
import {
  saveServiceInvoiceCache,
  saveServiceInvoiceOutbox,
} from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { fetchServiceInvoiceRecord } from 'features/serviceInvoices/services/serviceInvoiceRecordService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' },
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/clients', () => ({
  useClientNames: () => ({ 'client-1': 'VetSul' }),
}));
jest.mock(
  'features/serviceInvoices/services/serviceInvoiceRecordService',
  () => ({ fetchServiceInvoiceRecord: jest.fn() }),
);

const fetchRecord = jest.mocked(fetchServiceInvoiceRecord);

const SUMMARY = {
  id: 'note-1',
  number: '10',
  issueDate: '2026-10-20',
  amount: 150,
  clientId: 'client-1',
  clientName: 'VetSul',
  location: null,
  hasFile: true,
  syncStatus: 'SYNCED' as const,
};
const RECORD: ServiceInvoiceRecord = {
  ...SUMMARY,
  clientTaxId: '123',
  file: { name: 'nota.pdf', bytesSize: 10 },
};
const PENDING = {
  id: 'note-1',
  issueDate: '2026-10-20',
  amount: 150,
  clientId: 'client-1',
  file: {
    name: 'nota.pdf',
    mimeType: 'application/pdf',
    bytesSize: 10,
    hash: 'a',
  },
  createdAt: '2026-10-20T10:00:00.000Z',
};

const mount = () => renderHook(() => useServiceInvoiceRecord('note-1'));

beforeEach(async () => {
  fetchRecord.mockReset();
  mockAuth.session = { idToken: 'token' };
  await AsyncStorage.clear();
});

describe('useServiceInvoiceRecord', () => {
  it('shows the note of the server', async () => {
    fetchRecord.mockResolvedValue(RECORD);

    const hook = await mount();

    expect(fetchRecord).toHaveBeenCalledWith('token', 'note-1');
    expect(hook.current).toMatchObject({
      status: 'ready',
      record: RECORD,
      isOffline: false,
    });
  });

  it('keeps loading while there is no session', async () => {
    mockAuth.session = null;

    const hook = await mount();

    expect(hook.current.status).toBe('loading');
    expect(fetchRecord).not.toHaveBeenCalled();
  });

  it.each([
    ['client-1', 'VetSul'],
    ['client-9', ''],
  ])(
    'shows a note still in the queue without asking the server (%s)',
    async (clientId, clientName) => {
      await saveServiceInvoiceOutbox('user-1', [{ ...PENDING, clientId }]);

      const hook = await mount();

      expect(fetchRecord).not.toHaveBeenCalled();
      expect(hook.current.status).toBe('ready');
      expect(hook.current.record).toMatchObject({
        syncStatus: 'PENDING',
        clientName,
        file: { name: 'nota.pdf', bytesSize: 10 },
      });
    },
  );

  it('asks the server when the queue cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('broke'));
    fetchRecord.mockResolvedValue(RECORD);

    expect((await mount()).current.record).toEqual(RECORD);
  });

  it.each([
    ['notFound', new ApiError('gone', 'SERVICE_INVOICE_NOT_FOUND', 404)],
    ['error', new ApiError('broke', null, 500)],
    ['error', new TypeError('Network request failed')],
  ])('is %s for %s', async (status, failure) => {
    fetchRecord.mockRejectedValue(failure);

    expect((await mount()).current.status).toBe(status);
  });

  it('shows what was saved when the network is down', async () => {
    await saveServiceInvoiceCache('user-1', [SUMMARY]);
    fetchRecord.mockRejectedValue(new TypeError('Network request failed'));

    expect((await mount()).current).toMatchObject({
      status: 'ready',
      isOffline: true,
      record: { ...SUMMARY, clientTaxId: null, file: null },
    });
  });

  it('loads again when asked', async () => {
    fetchRecord.mockRejectedValueOnce(new ApiError('broke', null, 500));
    const hook = await mount();
    expect(hook.current.status).toBe('error');

    fetchRecord.mockResolvedValue(RECORD);
    await act(async () => hook.current.reload());

    expect(hook.current.status).toBe('ready');
  });

  it.each(['first answer is a success', 'first answer is a failure'])(
    'ignores an answer that arrives after a newer one (%s)',
    async scenario => {
      let answerFirst!: () => void;
      fetchRecord.mockReturnValueOnce(
        new Promise((resolve, reject) => {
          answerFirst = () =>
            scenario.endsWith('success')
              ? resolve({ ...RECORD, number: 'old' })
              : reject(new ApiError('old', null, 500));
        }),
      );
      fetchRecord.mockResolvedValueOnce(RECORD);
      const hook = await mount();
      await act(async () => hook.current.reload());

      await act(async () => answerFirst());

      expect(hook.current.status).toBe('ready');
      expect(hook.current.record?.number).toBe('10');
    },
  );
});
