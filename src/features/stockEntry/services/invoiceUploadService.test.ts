import { uploadInvoiceDocument, UploadError } from './invoiceUploadService';
import { InvoiceDocument, MAX_DOCUMENT_BYTES } from '../domain/invoiceDocument';

const DOCUMENT: InvoiceDocument = {
  id: '5f3b7d0c-2a1e-4c7b-9a11-1f2e3d4c5b6a',
  uri: 'file:///cache/invoice.pdf',
  bytes: new Uint8Array([1, 2, 3]),
  name: 'invoice.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 3,
  hash: 'a'.repeat(64),
};

const ID_TOKEN = 'id-token';

const TARGET = {
  url: 'http://localhost:4566/administranest-local',
  fields: { key: 'users/1/purchase-invoices/2/original', policy: 'eyJ...' },
  expiresAt: 1757366220000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/** S3 answers 204 with no body when the policy is satisfied. */
function bucketResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new Error('no body')),
  } as unknown as Response;
}

/**
 * React Native's FormData keeps its parts in `_parts` and has no iterator; the
 * one under jest does. Both answer the only question the test asks: in which
 * order the parts were appended.
 */
function fieldNames(body: unknown): string[] {
  const parts = (body as { _parts?: [string, unknown][] })._parts;
  return parts
    ? parts.map(([name]) => name)
    : Array.from((body as { keys: () => Iterable<string> }).keys());
}

describe('uploadInvoiceDocument', () => {
  let fetchMock: jest.Mock;

  // jest does not read `.env`, and the client refuses to guess a base URL.
  beforeAll(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const calls = () => fetchMock.mock.calls as [string, RequestInit][];

  it('signs, uploads and only then confirms', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(204))
      .mockResolvedValueOnce(
        jsonResponse({ contentLength: 3, contentType: 'application/pdf' }),
      );

    await uploadInvoiceDocument(DOCUMENT, ID_TOKEN);

    const [sign, upload, confirm] = calls();
    expect(sign[0]).toContain(`/stock-entries/${DOCUMENT.id}/upload-url`);
    expect(JSON.parse(String(sign[1].body))).toEqual({
      filename: 'invoice.pdf',
      fileMimeType: 'application/pdf',
      fileHash: DOCUMENT.hash,
      fileBytesSize: 3,
    });
    expect(upload[0]).toBe(TARGET.url);
    expect(confirm[0]).toContain(`/stock-entries/${DOCUMENT.id}/uploaded`);

    const authOf = (init: RequestInit) =>
      (init.headers as Record<string, string> | undefined)?.Authorization;
    expect(authOf(sign[1])).toBe(`Bearer ${ID_TOKEN}`);
    expect(authOf(confirm[1])).toBe(`Bearer ${ID_TOKEN}`);
    expect(authOf(upload[1])).toBeUndefined();
  });

  // S3 reads the policy fields as they arrive and stops at the file: a field
  // sent after it is ignored, and the upload is rejected as unsigned.
  it('sends the file after every policy field', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(204))
      .mockResolvedValueOnce(jsonResponse({}));

    await uploadInvoiceDocument(DOCUMENT, ID_TOKEN);

    expect(fieldNames(calls()[1][1].body)).toEqual(['key', 'policy', 'file']);
  });

  it('does not confirm an upload the bucket refused', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(400));

    await expect(
      uploadInvoiceDocument(DOCUMENT, ID_TOKEN),
    ).rejects.toMatchObject({
      reason: 'uploadRejected',
    });
    // Signed, uploaded, stopped: a 400 means the request broke a condition of
    // the policy, so signing the same thing again would change nothing.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('signs a fresh policy when the old one expired', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(403))
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(204))
      .mockResolvedValueOnce(jsonResponse({}));

    await uploadInvoiceDocument(DOCUMENT, ID_TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('gives up after the second policy', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(403))
      .mockResolvedValueOnce(jsonResponse(TARGET))
      .mockResolvedValueOnce(bucketResponse(403));

    await expect(
      uploadInvoiceDocument(DOCUMENT, ID_TOKEN),
    ).rejects.toBeInstanceOf(UploadError);
  });

  it('reads the failure from the error code, not the message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'INVOICE_FILE_DUPLICATED' }, 409),
    );

    await expect(
      uploadInvoiceDocument(DOCUMENT, ID_TOKEN),
    ).rejects.toMatchObject({
      reason: 'duplicateFile',
    });
  });

  it('tells a dead network apart from a refusal', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(
      uploadInvoiceDocument(DOCUMENT, ID_TOKEN),
    ).rejects.toMatchObject({
      reason: 'offline',
    });
  });

  it('refuses an oversized file without asking the API', async () => {
    await expect(
      uploadInvoiceDocument(
        { ...DOCUMENT, sizeBytes: MAX_DOCUMENT_BYTES + 1 },
        ID_TOKEN,
      ),
    ).rejects.toMatchObject({ reason: 'tooLarge' });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
