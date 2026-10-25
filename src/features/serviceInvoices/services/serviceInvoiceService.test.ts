import { ApiError, apiClient } from 'shared/services/apiClient';
import { postToPresignedForm } from 'shared/services/presignedUpload';

import {
  confirmServiceInvoice,
  discardServiceInvoiceDraft,
  extractServiceInvoice,
  fetchServiceInvoiceStatus,
} from './serviceInvoiceService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('shared/services/presignedUpload', () => ({
  postToPresignedForm: jest.fn(),
}));
jest.mock('shared/services/fileHash', () => ({
  sha256Hex: jest.fn(async () => 'a'.repeat(64)),
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'new-id') }));

const get = jest.mocked(apiClient.get);
const post = jest.mocked(apiClient.post);
const patch = jest.mocked(apiClient.patch);
const remove = jest.mocked(apiClient.delete);
const postToBucket = jest.mocked(postToPresignedForm);

const FILE = {
  uri: 'file:///cache/nota.pdf',
  bytes: new Uint8Array([1, 2, 3]),
  name: 'nota.pdf',
  mimeType: 'application/pdf',
};
const TARGET = { url: 'https://bucket', fields: { key: 'k' }, expiresAt: 1 };
const INPUT = {
  issueDate: '2026-10-13',
  amount: 1500,
  number: '1287',
  clientId: 'client-1',
};

function answerUpload(review: Record<string, unknown>) {
  post.mockImplementation(async (path: string) =>
    path.endsWith('/upload-url') ? TARGET : { review },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  postToBucket.mockResolvedValue({ ok: true, status: 204 } as Response);
});

describe('extractServiceInvoice', () => {
  it('asks for the upload with the file facts, sends the PDF and has it read', async () => {
    answerUpload({ status: 'SUCCESS', issueDate: '2026-10-13' });

    await extractServiceInvoice('id-token', 'inv-1', FILE);

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/service-invoices/inv-1/upload-url',
      {
        filename: 'nota.pdf',
        fileMimeType: 'application/pdf',
        fileHash: 'a'.repeat(64),
        fileBytesSize: 3,
      },
      { token: 'id-token' },
    );
    expect(postToBucket).toHaveBeenCalledWith(TARGET, FILE);
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/service-invoices/inv-1/uploaded',
      undefined,
      { token: 'id-token' },
    );
  });

  it('turns the review into what the screen starts from', async () => {
    answerUpload({
      status: 'SUCCESS',
      issueDate: '2026-10-13',
      amount: 1500,
      number: '1287',
      taker: { name: 'Clínica Exemplo', taxId: '12345678000195' },
      clientMatch: { id: 'client-1', name: 'Clínica Exemplo' },
      duplicateOf: { id: 'other', reason: 'SAME_AMOUNT_AND_DATE' },
    });

    expect(await extractServiceInvoice('id-token', 'inv-1', FILE)).toEqual({
      status: 'SUCCESS',
      issueDate: '2026-10-13',
      amount: 1500,
      number: '1287',
      taker: { name: 'Clínica Exemplo', taxId: '12345678000195' },
      clientMatch: { id: 'client-1', name: 'Clínica Exemplo', taxId: '' },
    });
  });

  it('passes on the suggested takers', async () => {
    answerUpload({
      status: 'SUCCESS',
      clientSuggestions: [
        { id: 'c-1', name: 'Clínica Boa Vida', taxId: '45321789000110' },
      ],
    });

    const extraction = await extractServiceInvoice('id-token', 'inv-1', FILE);

    expect(extraction.clientSuggestions).toEqual([
      { id: 'c-1', name: 'Clínica Boa Vida', taxId: '45321789000110' },
    ]);
  });

  it.each([
    [{ status: 'SUCCESS' }, 'SUCCESS'],
    [
      { status: 'SUCCESS', partial: { pagesRead: 1, totalPages: 3 } },
      'PARTIAL',
    ],
    [{ status: 'FAILED', failureReason: 'NO_TEXT_LAYER' }, 'FAILED'],
    [{ status: 'MANUAL' }, 'FAILED'],
  ])('reads %p as %p', async (review, status) => {
    answerUpload(review);

    const extraction = await extractServiceInvoice('id-token', 'inv-1', FILE);

    expect(extraction.status).toBe(status);
  });

  it('does not tell the API the upload finished when the bucket refused it', async () => {
    answerUpload({ status: 'SUCCESS' });
    postToBucket.mockResolvedValue({ ok: false, status: 403 } as Response);

    await expect(
      extractServiceInvoice('id-token', 'inv-1', FILE),
    ).rejects.toThrow('403');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('lets an API refusal through with its code', async () => {
    post.mockRejectedValue(
      new ApiError('dup', 'SERVICE_INVOICE_FILE_DUPLICATED', 409),
    );

    await expect(
      extractServiceInvoice('id-token', 'inv-1', FILE),
    ).rejects.toMatchObject({ code: 'SERVICE_INVOICE_FILE_DUPLICATED' });
    expect(postToBucket).not.toHaveBeenCalled();
  });
});

describe('confirmServiceInvoice', () => {
  beforeEach(() => {
    patch.mockResolvedValue({});
    post.mockResolvedValue({ id: 'inv-1', financialEntryId: 'entry-1' });
  });

  it('saves the reviewed data, then confirms the note', async () => {
    const result = await confirmServiceInvoice('id-token', 'inv-1', INPUT);

    expect(patch).toHaveBeenCalledWith('/service-invoices/inv-1', INPUT, {
      token: 'id-token',
    });
    expect(post).toHaveBeenCalledWith(
      '/service-invoices/inv-1/confirm',
      { allowDuplicate: false },
      { token: 'id-token' },
    );
    expect(result).toEqual({ id: 'inv-1' });
  });

  it('clears a number the person erased', async () => {
    const withoutNumber = {
      issueDate: INPUT.issueDate,
      amount: INPUT.amount,
      clientId: INPUT.clientId,
    };

    await confirmServiceInvoice('id-token', 'inv-1', withoutNumber);

    expect(patch.mock.calls[0][1]).toEqual({ ...withoutNumber, number: null });
  });

  it('confirms a similar note when the person insists', async () => {
    await confirmServiceInvoice('id-token', 'inv-1', INPUT, {
      allowDuplicate: true,
    });

    expect(post.mock.calls[0][1]).toEqual({ allowDuplicate: true });
  });

  it('answers with the similar note instead of failing', async () => {
    post.mockRejectedValue(
      new ApiError('dup', 'SERVICE_INVOICE_POSSIBLE_DUPLICATE', 409, {
        duplicateOf: {
          id: 'inv-0',
          number: '1287',
          issueDate: '2026-10-13',
          amount: 1500,
          clientName: 'Clínica Exemplo',
          reason: 'SAME_AMOUNT_AND_DATE',
        },
      }),
    );

    expect(await confirmServiceInvoice('id-token', 'inv-1', INPUT)).toEqual({
      duplicateOf: {
        id: 'inv-0',
        number: '1287',
        issueDate: '2026-10-13',
        amount: 1500,
        clientName: 'Clínica Exemplo',
      },
    });
  });

  it('does not confirm when saving the data fails', async () => {
    patch.mockRejectedValue(new ApiError('bad', 'CLIENT_NOT_FOUND', 404));

    await expect(
      confirmServiceInvoice('id-token', 'inv-1', INPUT),
    ).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' });
    expect(post).not.toHaveBeenCalled();
  });

  it('lets any other refusal through', async () => {
    post.mockRejectedValue(
      new ApiError('not ready', 'SERVICE_INVOICE_NOT_READY', 400),
    );

    await expect(
      confirmServiceInvoice('id-token', 'inv-1', INPUT),
    ).rejects.toMatchObject({ code: 'SERVICE_INVOICE_NOT_READY' });
  });
});

describe('fetchServiceInvoiceStatus', () => {
  it('answers the status of the note', async () => {
    get.mockResolvedValue({ id: 'inv-1', status: 'CONFIRMED' });

    expect(await fetchServiceInvoiceStatus('id-token', 'inv-1')).toBe(
      'CONFIRMED',
    );
    expect(get).toHaveBeenCalledWith('/service-invoices/inv-1', {
      token: 'id-token',
    });
  });

  it('answers null when the backend has no such note', async () => {
    get.mockRejectedValue(
      new ApiError('nope', 'SERVICE_INVOICE_NOT_FOUND', 404),
    );

    expect(await fetchServiceInvoiceStatus('id-token', 'inv-1')).toBeNull();
  });

  it('lets any other failure through', async () => {
    get.mockRejectedValue(new ApiError('down', null, 503));

    await expect(
      fetchServiceInvoiceStatus('id-token', 'inv-1'),
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe('discardServiceInvoiceDraft', () => {
  it('discards a draft', async () => {
    get.mockResolvedValue({ status: 'DRAFT' });

    await discardServiceInvoiceDraft('id-token', 'inv-1');

    expect(remove).toHaveBeenCalledWith('/service-invoices/inv-1', {
      token: 'id-token',
    });
  });

  it.each(['CONFIRMED', 'CANCELLED'])(
    'leaves a %s note alone, since the same route deletes a confirmed one',
    async status => {
      get.mockResolvedValue({ status });

      await discardServiceInvoiceDraft('id-token', 'inv-1');

      expect(remove).not.toHaveBeenCalled();
    },
  );

  it('does nothing when the draft was never created', async () => {
    get.mockRejectedValue(
      new ApiError('nope', 'SERVICE_INVOICE_NOT_FOUND', 404),
    );

    await discardServiceInvoiceDraft('id-token', 'inv-1');

    expect(remove).not.toHaveBeenCalled();
  });
});
