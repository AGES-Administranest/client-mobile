import { act } from 'react-test-renderer';

import type { ServiceInvoiceRecord } from 'features/serviceInvoices/domain/serviceInvoiceRecord.types';
import { useServiceInvoiceDeletion } from 'features/serviceInvoices/hooks/useServiceInvoiceDeletion';
import {
  discardServiceInvoice,
  notifyOfflineServiceInvoicesChanged,
  queueInvoiceDeletion,
} from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { deleteConfirmedServiceInvoice } from 'features/serviceInvoices/services/serviceInvoiceRecordService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' },
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock(
  'features/serviceInvoices/services/serviceInvoiceRecordService',
  () => ({ deleteConfirmedServiceInvoice: jest.fn() }),
);
jest.mock(
  'features/serviceInvoices/services/offlineServiceInvoiceStore',
  () => ({
    discardServiceInvoice: jest.fn(),
    notifyOfflineServiceInvoicesChanged: jest.fn(),
    queueInvoiceDeletion: jest.fn(),
  }),
);

const deleteOnServer = jest.mocked(deleteConfirmedServiceInvoice);
const onDeleted = jest.fn();

const note = (
  syncStatus: ServiceInvoiceRecord['syncStatus'] = 'SYNCED',
): ServiceInvoiceRecord => ({
  id: 'note-1',
  number: '10',
  issueDate: '2026-10-20',
  amount: 150,
  clientId: 'client-1',
  clientName: 'VetSul',
  location: null,
  hasFile: true,
  syncStatus,
  clientTaxId: null,
  file: null,
});

const mount = (record: ServiceInvoiceRecord | null = note()) =>
  renderHook(() => useServiceInvoiceDeletion({ record, onDeleted }));

type Hook = Awaited<ReturnType<typeof mount>>;
const confirm = async (hook: Hook) => {
  await act(async () => hook.current.request());
  await act(async () => {
    await hook.current.confirm();
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  mockAuth.session = { idToken: 'token' };
});

describe('useServiceInvoiceDeletion', () => {
  it('asks before deleting and can be given up', async () => {
    const hook = await mount();
    expect(hook.current.step).toBe('idle');

    await act(async () => hook.current.request());
    expect(hook.current.step).toBe('confirming');

    await act(async () => hook.current.cancel());
    expect(hook.current.step).toBe('idle');
    expect(deleteOnServer).not.toHaveBeenCalled();
  });

  it('deletes a sent note on the server and waits to be acknowledged', async () => {
    const hook = await mount();

    await confirm(hook);

    expect(deleteOnServer).toHaveBeenCalledWith('token', 'note-1');
    expect(notifyOfflineServiceInvoicesChanged).toHaveBeenCalledTimes(1);
    expect(hook.current).toMatchObject({ step: 'done', queuedOffline: false });
    expect(onDeleted).not.toHaveBeenCalled();

    await act(async () => hook.current.acknowledge());
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(hook.current.step).toBe('idle');
  });

  it.each(['PENDING', 'ERROR'] as const)(
    'discards a note that was never sent (%s)',
    async status => {
      const hook = await mount(note(status));

      await confirm(hook);

      expect(discardServiceInvoice).toHaveBeenCalledWith('user-1', 'note-1');
      expect(deleteOnServer).not.toHaveBeenCalled();
      expect(hook.current.step).toBe('done');
    },
  );

  it('queues the deletion when the network is down', async () => {
    deleteOnServer.mockRejectedValue(new TypeError('Network request failed'));
    const hook = await mount();

    await confirm(hook);

    expect(queueInvoiceDeletion).toHaveBeenCalledWith('user-1', 'note-1');
    expect(hook.current).toMatchObject({ step: 'done', queuedOffline: true });
  });

  it('is done when the note was already gone', async () => {
    deleteOnServer.mockRejectedValue(new ApiError('gone', null, 404));
    const hook = await mount();

    await confirm(hook);

    expect(hook.current).toMatchObject({ step: 'done', failed: false });
  });

  it('goes back to asking when it fails, and clears it on a new try', async () => {
    deleteOnServer.mockRejectedValueOnce(new ApiError('broke', null, 500));
    const hook = await mount();

    await confirm(hook);
    expect(hook.current).toMatchObject({ step: 'confirming', failed: true });
    expect(notifyOfflineServiceInvoicesChanged).not.toHaveBeenCalled();

    await confirm(hook);
    expect(hook.current).toMatchObject({ step: 'done', failed: false });
  });

  it('fails when the session is over', async () => {
    mockAuth.session = null;
    const hook = await mount();

    await confirm(hook);

    expect(hook.current.failed).toBe(true);
    expect(deleteOnServer).not.toHaveBeenCalled();
  });

  it('has nothing to delete without a note', async () => {
    const hook = await mount(null);

    await confirm(hook);

    expect(hook.current.step).toBe('confirming');
    expect(deleteOnServer).not.toHaveBeenCalled();
  });

  it('sends a single request when confirmed twice', async () => {
    let finish!: () => void;
    deleteOnServer.mockReturnValue(
      new Promise(resolve => {
        finish = () => resolve(undefined);
      }),
    );
    const hook = await mount();

    await act(async () => {
      hook.current.confirm();
      hook.current.confirm();
    });
    expect(hook.current.step).toBe('deleting');
    await act(async () => finish());

    expect(deleteOnServer).toHaveBeenCalledTimes(1);
    expect(hook.current.step).toBe('done');
  });
});
