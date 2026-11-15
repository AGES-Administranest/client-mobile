import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from 'shared/services/apiClient';

import { syncPendingInvoiceDeletions } from './invoiceDeletionSyncService';
import {
  loadPendingInvoiceDeletions,
  queueInvoiceDeletion,
} from './offlineServiceInvoiceStore';
import { deleteConfirmedServiceInvoice } from './serviceInvoiceRecordService';

jest.mock('./serviceInvoiceRecordService', () => ({
  deleteConfirmedServiceInvoice: jest.fn(),
}));

const remove = jest.mocked(deleteConfirmedServiceInvoice);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('syncPendingInvoiceDeletions', () => {
  it('sends each queued deletion and empties the queue', async () => {
    remove.mockResolvedValue(undefined);
    await queueInvoiceDeletion('u1', 'a');
    await queueInvoiceDeletion('u1', 'b');

    await expect(syncPendingInvoiceDeletions('token', 'u1')).resolves.toBe(2);

    expect(remove).toHaveBeenNthCalledWith(1, 'token', 'a');
    expect(remove).toHaveBeenNthCalledWith(2, 'token', 'b');
    expect(await loadPendingInvoiceDeletions('u1')).toEqual([]);
  });

  it('counts a note the backend no longer has as deleted', async () => {
    remove.mockRejectedValue(new ApiError('gone', 'NOT_FOUND', 404));
    await queueInvoiceDeletion('u1', 'a');

    await expect(syncPendingInvoiceDeletions('token', 'u1')).resolves.toBe(1);

    expect(await loadPendingInvoiceDeletions('u1')).toEqual([]);
  });

  it('keeps what is queued when the backend cannot be reached', async () => {
    remove.mockRejectedValue(new TypeError('Network request failed'));
    await queueInvoiceDeletion('u1', 'a');
    await queueInvoiceDeletion('u1', 'b');

    await expect(syncPendingInvoiceDeletions('token', 'u1')).resolves.toBe(0);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(await loadPendingInvoiceDeletions('u1')).toEqual(['a', 'b']);
  });

  it('does not queue the same note twice', async () => {
    await queueInvoiceDeletion('u1', 'a');
    await queueInvoiceDeletion('u1', 'a');

    expect(await loadPendingInvoiceDeletions('u1')).toEqual(['a']);
  });
});
