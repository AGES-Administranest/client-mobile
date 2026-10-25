import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  acknowledgeServiceInvoiceRejection,
  discardServiceInvoice,
  loadReadingDifferences,
  loadServiceInvoiceOutbox,
  markServiceInvoiceRejected,
  queueManualServiceInvoice,
  removeSyncedServiceInvoice,
  saveReadingDifference,
  subscribeOfflineServiceInvoices,
} from './offlineServiceInvoiceStore';
import { removePendingPdf, savePendingPdf } from './pendingPdfStore';

jest.mock('./pendingPdfStore', () => ({
  savePendingPdf: jest.fn(),
  removePendingPdf: jest.fn(),
  readPendingPdf: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'app-generated-id'),
  digest: jest.fn(async () => new Uint8Array([0, 15, 255]).buffer),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const INPUT = {
  issueDate: '2026-03-15',
  amount: 1850,
  number: '2026/0042',
  clientId: 'client-1',
};
const PDF = {
  bytes: new Uint8Array([1, 2, 3, 4]),
  name: 'nota.pdf',
  mimeType: 'application/pdf',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('queueManualServiceInvoice', () => {
  it('queues the typed data with an id made by the app and the file facts', async () => {
    const saved = await queueManualServiceInvoice('user-1', INPUT, PDF);

    expect(saved).toMatchObject({
      id: 'app-generated-id',
      ...INPUT,
      file: {
        name: 'nota.pdf',
        mimeType: 'application/pdf',
        bytesSize: 4,
        hash: '000fff',
      },
    });
    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([saved]);
  });

  it('puts the PDF on disk under the same id', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);

    expect(savePendingPdf).toHaveBeenCalledWith(
      'user-1',
      'app-generated-id',
      PDF.bytes,
    );
  });

  it('keeps earlier notes and does not mix users', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);
    await queueManualServiceInvoice('user-1', INPUT, PDF);
    await queueManualServiceInvoice('user-2', INPUT, PDF);

    expect(await loadServiceInvoiceOutbox('user-1')).toHaveLength(2);
    expect(await loadServiceInvoiceOutbox('user-2')).toHaveLength(1);
  });

  it('tells the listeners the queue changed', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeOfflineServiceInvoices(listener);

    await queueManualServiceInvoice('user-1', INPUT, PDF);
    unsubscribe();
    await queueManualServiceInvoice('user-1', INPUT, PDF);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not leave a PDF behind when the queue cannot be saved', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(
      queueManualServiceInvoice('user-1', INPUT, PDF),
    ).rejects.toThrow('disk full');

    expect(removePendingPdf).toHaveBeenCalledWith('user-1', 'app-generated-id');
  });

  it('refuses to overwrite a queue it cannot read', async () => {
    await AsyncStorage.setItem(
      '@administranest:service-invoices:user-1:outbox',
      '{not json',
    );

    await expect(
      queueManualServiceInvoice('user-1', INPUT, PDF),
    ).rejects.toThrow();
    expect(
      await AsyncStorage.getItem(
        '@administranest:service-invoices:user-1:outbox',
      ),
    ).toBe('{not json');
  });
});

describe('rejections', () => {
  it('marks a note as refused, still queued, and later as seen', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);

    await markServiceInvoiceRejected('user-1', 'app-generated-id', 'X');
    expect((await loadServiceInvoiceOutbox('user-1'))[0].rejection).toEqual({
      code: 'X',
      acknowledged: false,
    });

    await acknowledgeServiceInvoiceRejection('user-1', 'app-generated-id');
    expect((await loadServiceInvoiceOutbox('user-1'))[0].rejection).toEqual({
      code: 'X',
      acknowledged: true,
    });
  });
});

describe('removeSyncedServiceInvoice', () => {
  it('drops the note from the queue and its PDF from the disk', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);

    await removeSyncedServiceInvoice('user-1', 'app-generated-id');

    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([]);
    expect(removePendingPdf).toHaveBeenCalledWith('user-1', 'app-generated-id');
  });
});

describe('reading differences', () => {
  it('keeps one difference per note', async () => {
    const first = {
      invoiceId: 'a',
      typed: { amount: 1 },
      read: { amount: 2 },
    };
    await saveReadingDifference('user-1', first);
    await saveReadingDifference('user-1', {
      ...first,
      read: { amount: 3 },
    });

    expect(await loadReadingDifferences('user-1')).toEqual([
      { ...first, read: { amount: 3 } },
    ]);
  });
});

describe('discardServiceInvoice', () => {
  it('takes the note out of the queue and deletes its PDF', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);

    const result = await discardServiceInvoice('user-1', 'app-generated-id');

    expect(result).toEqual({ pdfRemoved: true });
    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([]);
    expect(removePendingPdf).toHaveBeenCalledWith('user-1', 'app-generated-id');
  });

  it('leaves the other notes alone', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);
    await discardServiceInvoice('user-1', 'other-id');

    expect(await loadServiceInvoiceOutbox('user-1')).toHaveLength(1);
  });

  it('still drops the note when its PDF cannot be deleted, and says so', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);
    jest.mocked(removePendingPdf).mockImplementationOnce(() => {
      throw new Error('locked');
    });

    const result = await discardServiceInvoice('user-1', 'app-generated-id');

    expect(result).toEqual({ pdfRemoved: false });
    expect(await loadServiceInvoiceOutbox('user-1')).toEqual([]);
  });

  it('tells the listeners the queue changed', async () => {
    await queueManualServiceInvoice('user-1', INPUT, PDF);
    const listener = jest.fn();
    const unsubscribe = subscribeOfflineServiceInvoices(listener);

    await discardServiceInvoice('user-1', 'app-generated-id');
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
