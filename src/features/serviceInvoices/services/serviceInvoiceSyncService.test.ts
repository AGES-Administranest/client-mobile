import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveLocalClientId } from 'features/clients';
import { ApiError } from 'shared/services/apiClient';

import {
  loadReadingDifferences,
  loadServiceInvoiceOutbox,
  saveServiceInvoiceOutbox,
} from './offlineServiceInvoiceStore';
import { readPendingPdf, removePendingPdf } from './pendingPdfStore';
import {
  confirmServiceInvoice,
  extractServiceInvoice,
  fetchServiceInvoiceStatus,
} from './serviceInvoiceService';
import { syncPendingServiceInvoices } from './serviceInvoiceSyncService';
import {
  CLIENT_NOT_SYNCED,
  PENDING_FILE_MISSING,
  POSSIBLE_DUPLICATE,
  type PendingServiceInvoice,
} from '../domain/offlineServiceInvoices';

jest.mock('features/clients', () => ({ resolveLocalClientId: jest.fn() }));
jest.mock('./pendingPdfStore', () => ({
  readPendingPdf: jest.fn(),
  removePendingPdf: jest.fn(),
  savePendingPdf: jest.fn(),
}));
jest.mock('./serviceInvoiceService', () => ({
  confirmServiceInvoice: jest.fn(),
  extractServiceInvoice: jest.fn(),
  fetchServiceInvoiceStatus: jest.fn(),
}));

const resolveClient = jest.mocked(resolveLocalClientId);
const readPdf = jest.mocked(readPendingPdf);
const fetchStatus = jest.mocked(fetchServiceInvoiceStatus);
const extract = jest.mocked(extractServiceInvoice);
const confirm = jest.mocked(confirmServiceInvoice);

const PDF = {
  uri: 'file:///documents/a.pdf',
  bytes: new Uint8Array([1, 2, 3]),
};

function note(
  id: string,
  overrides: Partial<PendingServiceInvoice> = {},
): PendingServiceInvoice {
  return {
    id,
    issueDate: '2026-03-15',
    amount: 1850,
    number: '2026/0042',
    clientId: 'client-1',
    file: {
      name: `${id}.pdf`,
      mimeType: 'application/pdf',
      bytesSize: 3,
      hash: 'a'.repeat(64),
    },
    createdAt: '2026-03-16T10:00:00.000Z',
    ...overrides,
  };
}

async function queue(...notes: PendingServiceInvoice[]) {
  await saveServiceInvoiceOutbox('user-1', notes);
}

const sync = () => syncPendingServiceInvoices('id-token', 'user-1');

const confirmedIds = () => confirm.mock.calls.map(([, id]) => id);

beforeEach(async () => {
  await AsyncStorage.clear();
  [resolveClient, readPdf, fetchStatus, extract, confirm].forEach(mock =>
    mock.mockReset(),
  );
  jest.mocked(removePendingPdf).mockReset();
  resolveClient.mockImplementation(async (_user, clientId) => ({
    status: 'resolved',
    clientId,
  }));
  readPdf.mockResolvedValue(PDF);
  fetchStatus.mockResolvedValue(null);
  extract.mockResolvedValue({ status: 'SUCCESS' });
  confirm.mockImplementation(async (_token, id) => ({ id }));
});

describe('syncPendingServiceInvoices', () => {
  it('sends the PDF under the app id, then confirms the typed data', async () => {
    await queue(note('a'));

    const outcome = await sync();

    expect(extract).toHaveBeenCalledWith('id-token', 'a', {
      uri: PDF.uri,
      bytes: PDF.bytes,
      name: 'a.pdf',
      mimeType: 'application/pdf',
    });
    expect(confirm).toHaveBeenCalledWith(
      'id-token',
      'a',
      {
        issueDate: '2026-03-15',
        amount: 1850,
        number: '2026/0042',
        clientId: 'client-1',
      },
      { allowDuplicate: false },
    );
    expect(outcome).toEqual({ synced: 1, rejected: 0, pending: 0 });
  });

  it('sends the PDF before the data, since the draft is born with the upload', async () => {
    await queue(note('a'));
    const order: string[] = [];
    extract.mockImplementation(async () => {
      order.push('upload');
      return { status: 'SUCCESS' };
    });
    confirm.mockImplementation(async (_token, id) => {
      order.push('confirm');
      return { id };
    });

    await sync();

    expect(order).toEqual(['upload', 'confirm']);
  });

  it('drops a synced note from the queue and its PDF from the disk', async () => {
    await queue(note('a'), note('b'));

    await sync();

    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([]);
    expect(removePendingPdf).toHaveBeenCalledWith('user-1', 'a');
    expect(removePendingPdf).toHaveBeenCalledWith('user-1', 'b');
  });

  it('sends in the order the notes were typed', async () => {
    await queue(note('a'), note('b'), note('c'));

    await sync();

    expect(confirmedIds()).toEqual(['a', 'b', 'c']);
  });

  it('counts a note an earlier run already confirmed as synced, without sending it again', async () => {
    await queue(note('a'));
    fetchStatus.mockResolvedValue('CONFIRMED');

    const outcome = await sync();

    expect(outcome.synced).toBe(1);
    expect(extract).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([]);
  });

  it('finishes a note an earlier run left as a draft', async () => {
    await queue(note('a'));
    fetchStatus.mockResolvedValue('DRAFT');

    const outcome = await sync();

    expect(confirmedIds()).toEqual(['a']);
    expect(outcome.synced).toBe(1);
  });

  describe('the taker', () => {
    it('swaps the id of a taker that was registered offline for the real one', async () => {
      await queue(note('a', { clientId: 'local:abc' }));
      resolveClient.mockResolvedValue({
        status: 'resolved',
        clientId: 'real-1',
      });

      await sync();

      expect(confirm.mock.calls[0][2].clientId).toBe('real-1');
    });

    it('waits for a taker that has not synced yet, without refusing the note', async () => {
      await queue(note('a', { clientId: 'local:abc' }), note('b'));
      resolveClient.mockImplementation(async (_user, clientId) =>
        clientId === 'local:abc'
          ? { status: 'pending' }
          : { status: 'resolved', clientId },
      );

      const outcome = await sync();

      expect(outcome).toEqual({ synced: 1, rejected: 0, pending: 1 });
      const left = await loadServiceInvoiceOutbox('user-1');
      expect(left.map(item => item.id)).toEqual(['a']);
      expect(left[0].rejection).toBeUndefined();
    });

    it('does not send a note whose taker was refused, and says why', async () => {
      await queue(note('a', { clientId: 'local:abc' }));
      resolveClient.mockResolvedValue({ status: 'missing' });

      const outcome = await sync();

      expect(outcome).toEqual({ synced: 0, rejected: 1, pending: 0 });
      expect(extract).not.toHaveBeenCalled();
      const [kept] = await loadServiceInvoiceOutbox('user-1');
      expect(kept.rejection).toEqual({
        code: CLIENT_NOT_SYNCED,
        acknowledged: false,
      });
    });
  });

  describe('failures', () => {
    it('keeps the queue and stops on a network failure, to try again later', async () => {
      await queue(note('a'), note('b'));
      extract.mockRejectedValue(new TypeError('Network request failed'));

      const outcome = await sync();

      expect(outcome).toEqual({ synced: 0, rejected: 0, pending: 2 });
      expect(extract).toHaveBeenCalledTimes(1);
      expect(await loadServiceInvoiceOutbox('user-1')).toHaveLength(2);
    });

    it.each([401, 403, 408, 429, 500, 503])(
      'treats a %s as something to retry, not a refusal',
      async status => {
        await queue(note('a'));
        confirm.mockRejectedValue(new ApiError('boom', 'X', status));

        const outcome = await sync();

        expect(outcome).toEqual({ synced: 0, rejected: 0, pending: 1 });
      },
    );

    it.each([400, 404, 409, 413, 422])(
      'refuses the note for good on a %s, keeping it and its PDF',
      async status => {
        await queue(note('a'), note('b'));
        extract.mockImplementation(async (_token, id) => {
          if (id === 'a') {
            throw new ApiError('no', 'SERVICE_INVOICE_FILE_DUPLICATED', status);
          }
          return { status: 'SUCCESS' };
        });

        const outcome = await sync();

        expect(outcome).toEqual({ synced: 1, rejected: 1, pending: 0 });
        const [kept] = await loadServiceInvoiceOutbox('user-1');
        expect(kept.id).toBe('a');
        expect(kept.rejection?.code).toBe('SERVICE_INVOICE_FILE_DUPLICATED');
        expect(removePendingPdf).not.toHaveBeenCalledWith('user-1', 'a');
      },
    );

    it('refuses a note whose PDF is no longer on the device', async () => {
      await queue(note('a'));
      readPdf.mockResolvedValue(null);

      await sync();

      expect(extract).not.toHaveBeenCalled();
      const [kept] = await loadServiceInvoiceOutbox('user-1');
      expect(kept.rejection?.code).toBe(PENDING_FILE_MISSING);
    });

    it('does not send a refused note again', async () => {
      await queue(note('a', { rejection: { code: 'X', acknowledged: true } }));

      const outcome = await sync();

      expect(extract).not.toHaveBeenCalled();
      expect(outcome).toEqual({ synced: 0, rejected: 0, pending: 0 });
    });
  });

  describe('a similar note', () => {
    const SIMILAR = {
      id: 'inv-0',
      issueDate: '2026-03-15',
      amount: 1850,
      clientName: 'Clínica Exemplo',
    };

    it('refuses the note, for the person to decide', async () => {
      await queue(note('a'));
      confirm.mockResolvedValue({ duplicateOf: SIMILAR });

      const outcome = await sync();

      expect(outcome).toEqual({ synced: 0, rejected: 1, pending: 0 });
      const [kept] = await loadServiceInvoiceOutbox('user-1');
      expect(kept.rejection?.code).toBe(POSSIBLE_DUPLICATE);
    });

    it('confirms it when the person chose to send it anyway', async () => {
      await queue(note('a', { allowDuplicate: true }));

      const outcome = await sync();

      expect(confirm.mock.calls[0][3]).toEqual({ allowDuplicate: true });
      expect(outcome.synced).toBe(1);
    });
  });

  describe('what the typed data wins over', () => {
    it('keeps a differing reading aside and never touches the queue with it', async () => {
      await queue(note('a'));
      extract.mockResolvedValue({ status: 'SUCCESS', amount: 1950 });

      await sync();

      expect(confirm.mock.calls[0][2].amount).toBe(1850);
      expect(await loadReadingDifferences('user-1')).toEqual([
        { invoiceId: 'a', typed: { amount: 1850 }, read: { amount: 1950 } },
      ]);
    });

    it('keeps nothing when the reading agrees', async () => {
      await queue(note('a'));
      extract.mockResolvedValue({ status: 'SUCCESS', amount: 1850 });

      await sync();

      expect(await loadReadingDifferences('user-1')).toEqual([]);
    });
  });

  it('lets simultaneous calls share one run', async () => {
    await queue(note('a'));

    const [first, second] = await Promise.all([sync(), sync()]);

    expect(first).toBe(second);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
