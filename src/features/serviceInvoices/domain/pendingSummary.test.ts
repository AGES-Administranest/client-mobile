import type { PendingServiceInvoice } from './offlineServiceInvoices';
import { mergeInvoiceSources, pendingToSummary } from './pendingSummary';
import type { ServiceInvoiceSummary } from './serviceInvoiceRecord.types';

const pending: PendingServiceInvoice = {
  id: 'p1',
  issueDate: '2026-05-01',
  amount: 50,
  clientId: 'c1',
  file: {
    name: 'p1.pdf',
    mimeType: 'application/pdf',
    bytesSize: 9,
    hash: 'h',
  },
  createdAt: '2026-05-01T10:00:00.000Z',
};

const synced: ServiceInvoiceSummary = {
  id: 's1',
  number: null,
  issueDate: '2026-04-01',
  amount: 10,
  clientId: 'c1',
  clientName: 'HospVet Sul',
  location: null,
  hasFile: true,
  syncStatus: 'SYNCED',
};

describe('pendingToSummary', () => {
  it('waits for the connection while nothing was refused', () => {
    expect(pendingToSummary(pending, 'HospVet Sul')).toMatchObject({
      id: 'p1',
      clientName: 'HospVet Sul',
      syncStatus: 'PENDING',
      hasFile: true,
    });
  });

  it('is an error once the backend refused it', () => {
    const refused = {
      ...pending,
      rejection: { code: 'X', acknowledged: false },
    };

    expect(pendingToSummary(refused, '').syncStatus).toBe('ERROR');
  });
});

describe('mergeInvoiceSources', () => {
  const clientNames = { c1: 'HospVet Sul' };

  it('adds the notes typed offline to the ones the backend has', () => {
    const merged = mergeInvoiceSources({
      server: [synced],
      pending: [pending],
      deletedIds: [],
      clientNames,
    });

    expect(merged.map(item => item.id)).toEqual(['p1', 's1']);
    expect(merged[0].clientName).toBe('HospVet Sul');
  });

  it('hides the notes deleted offline', () => {
    expect(
      mergeInvoiceSources({
        server: [synced],
        pending: [],
        deletedIds: ['s1'],
        clientNames,
      }),
    ).toEqual([]);
  });

  it('does not repeat a note that already went up', () => {
    const merged = mergeInvoiceSources({
      server: [{ ...synced, id: 'p1' }],
      pending: [pending],
      deletedIds: [],
      clientNames,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].syncStatus).toBe('SYNCED');
  });
});
