import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  correctServiceInvoice,
  deleteConfirmedServiceInvoice,
  fetchServiceInvoiceRecord,
  fetchServiceInvoices,
  requestServiceInvoiceDownload,
} from './serviceInvoiceRecordService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const get = jest.mocked(apiClient.get);
const patch = jest.mocked(apiClient.patch);
const remove = jest.mocked(apiClient.delete);

const RESPONSE = {
  id: 'n1',
  number: '000458',
  issueDate: '2026-04-22',
  amount: 1284.5,
  client: { id: 'c1', name: 'HospVet Sul', taxId: '12345678000190' },
  location: 'São Paulo, SP',
  hasFile: true,
  file: { name: 'nota.pdf', bytesSize: 2048 },
};

beforeEach(() => jest.clearAllMocks());

describe('fetchServiceInvoices', () => {
  it('asks for the confirmed notes, newest first, and flattens them', async () => {
    get.mockResolvedValue({ items: [RESPONSE], total: 7 });

    const page = await fetchServiceInvoices('token', {
      page: 2,
      pageSize: 5,
      search: 'hosp',
    });

    expect(get).toHaveBeenCalledWith(
      '/service-invoices?status=CONFIRMED&sort=issueDate%3Adesc&page=2&pageSize=5&search=hosp',
      { token: 'token' },
    );
    expect(page.total).toBe(7);
    expect(page.items[0]).toEqual({
      id: 'n1',
      number: '000458',
      issueDate: '2026-04-22',
      amount: 1284.5,
      clientId: 'c1',
      clientName: 'HospVet Sul',
      location: 'São Paulo, SP',
      hasFile: true,
      syncStatus: 'SYNCED',
    });
  });

  it('leaves the search out when there is none', async () => {
    get.mockResolvedValue({ items: [], total: 0 });

    await fetchServiceInvoices('token', { page: 1, pageSize: 5 });

    expect(get.mock.calls[0][0]).not.toContain('search');
  });
});

describe('fetchServiceInvoiceRecord', () => {
  it('reads the confirmed note with its file', async () => {
    get.mockResolvedValue({ invoice: RESPONSE });

    const record = await fetchServiceInvoiceRecord('token', 'n1');

    expect(get).toHaveBeenCalledWith('/service-invoices/n1', {
      token: 'token',
    });
    expect(record).toMatchObject({
      clientTaxId: '12345678000190',
      file: { name: 'nota.pdf', bytesSize: 2048 },
    });
  });

  it('treats a note that is still a draft as not found', async () => {
    get.mockResolvedValue({});

    await expect(
      fetchServiceInvoiceRecord('token', 'n1'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lets the backend refusal through', async () => {
    get.mockRejectedValue(new ApiError('nope', 'NOT_FOUND', 404));

    await expect(
      fetchServiceInvoiceRecord('token', 'n1'),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('requestServiceInvoiceDownload', () => {
  it('asks the backend for the signed url', async () => {
    get.mockResolvedValue({ url: 'https://bucket/x', filename: 'nota.pdf' });

    await expect(requestServiceInvoiceDownload('token', 'n1')).resolves.toEqual(
      { url: 'https://bucket/x', filename: 'nota.pdf' },
    );
    expect(get).toHaveBeenCalledWith('/service-invoices/n1/download-url', {
      token: 'token',
    });
  });
});

describe('correctServiceInvoice', () => {
  it('sends only the corrected fields, never the owner', async () => {
    patch.mockResolvedValue({ invoice: RESPONSE });
    const input = {
      issueDate: '2026-04-22',
      amount: 1284.5,
      clientId: 'c1',
      location: null,
    };

    const record = await correctServiceInvoice('token', 'n1', input);

    expect(patch).toHaveBeenCalledWith('/service-invoices/n1', input, {
      token: 'token',
    });
    expect(record.id).toBe('n1');
  });
});

describe('deleteConfirmedServiceInvoice', () => {
  it('deletes the note by id', async () => {
    remove.mockResolvedValue(undefined);

    await deleteConfirmedServiceInvoice('token', 'n1');

    expect(remove).toHaveBeenCalledWith('/service-invoices/n1', {
      token: 'token',
    });
  });
});
