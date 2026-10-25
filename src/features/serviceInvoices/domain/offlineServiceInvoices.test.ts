import {
  countPending,
  firstRejection,
  firstUnseenRejection,
  isKnownRejectionCode,
  KNOWN_REJECTION_CODES,
  nextToSend,
  readingDifference,
  toPendingServiceInvoice,
  toSyncItem,
  type PendingServiceInvoice,
} from './offlineServiceInvoices';

const FILE = {
  name: 'nota.pdf',
  mimeType: 'application/pdf',
  bytesSize: 1024,
  hash: 'a'.repeat(64),
};

function invoice(
  id: string,
  overrides: Partial<PendingServiceInvoice> = {},
): PendingServiceInvoice {
  return {
    id,
    issueDate: '2026-03-15',
    amount: 1850,
    number: '2026/0042',
    clientId: 'client-1',
    file: FILE,
    createdAt: '2026-03-16T10:00:00.000Z',
    ...overrides,
  };
}

describe('toPendingServiceInvoice', () => {
  it('keeps what was typed and leaves the number out when there is none', () => {
    const pending = toPendingServiceInvoice(
      'id-1',
      { issueDate: '2026-03-15', amount: 10, clientId: 'c-1' },
      FILE,
      '2026-03-16T10:00:00.000Z',
    );

    expect(pending).toEqual({
      id: 'id-1',
      issueDate: '2026-03-15',
      amount: 10,
      clientId: 'c-1',
      file: FILE,
      createdAt: '2026-03-16T10:00:00.000Z',
    });
    expect(pending).not.toHaveProperty('number');
  });
});

describe('toSyncItem', () => {
  it('sends the app id with the typed data and the real taker id', () => {
    expect(
      toSyncItem(invoice('id-1', { clientId: 'local:abc' }), 'real-1'),
    ).toEqual({
      id: 'id-1',
      issueDate: '2026-03-15',
      amount: 1850,
      number: '2026/0042',
      clientId: 'real-1',
      fileName: 'nota.pdf',
      fileHash: FILE.hash,
      fileBytesSize: 1024,
    });
  });
});

describe('countPending', () => {
  it('separates what waits from what was refused', () => {
    const queue = [
      invoice('a'),
      invoice('b', { rejection: { code: 'X', acknowledged: false } }),
      invoice('c'),
    ];

    expect(countPending(queue)).toEqual({ waiting: 2, rejected: 1 });
    expect(countPending([])).toEqual({ waiting: 0, rejected: 0 });
  });
});

describe('nextToSend', () => {
  it('skips refused notes and the ones already tried in this round', () => {
    const queue = [
      invoice('a', { rejection: { code: null, acknowledged: false } }),
      invoice('b'),
      invoice('c'),
    ];

    expect(nextToSend(queue, new Set())?.id).toBe('b');
    expect(nextToSend(queue, new Set(['b']))?.id).toBe('c');
    expect(nextToSend(queue, new Set(['b', 'c']))).toBeUndefined();
  });
});

describe('firstUnseenRejection', () => {
  it('finds the first refusal nobody has acknowledged', () => {
    const queue = [
      invoice('a', { rejection: { code: 'X', acknowledged: true } }),
      invoice('b'),
      invoice('c', { rejection: { code: 'Y', acknowledged: false } }),
    ];

    expect(firstUnseenRejection(queue)?.id).toBe('c');
    expect(firstUnseenRejection([invoice('a')])).toBeNull();
  });
});

describe('readingDifference', () => {
  it('is null without a reading', () => {
    expect(readingDifference(invoice('a'), undefined)).toBeNull();
  });

  it('is null when the reading agrees or found nothing', () => {
    expect(
      readingDifference(invoice('a'), {
        issueDate: '2026-03-15',
        amount: 1850,
      }),
    ).toBeNull();
    expect(readingDifference(invoice('a'), {})).toBeNull();
  });

  it('keeps only the fields that differ, with both sides', () => {
    expect(
      readingDifference(invoice('a'), {
        issueDate: '2026-03-15',
        amount: 1900,
        number: '99',
      }),
    ).toEqual({
      invoiceId: 'a',
      typed: { amount: 1850, number: '2026/0042' },
      read: { amount: 1900, number: '99' },
    });
  });
});

describe('firstRejection', () => {
  it('finds the first refused note, seen or not', () => {
    const queue = [
      invoice('a'),
      invoice('b', { rejection: { code: 'X', acknowledged: true } }),
      invoice('c', { rejection: { code: 'Y', acknowledged: false } }),
    ];

    expect(firstRejection(queue)?.id).toBe('b');
    expect(firstRejection([invoice('a')])).toBeNull();
  });
});

describe('isKnownRejectionCode', () => {
  it.each(KNOWN_REJECTION_CODES)('knows %s', code => {
    expect(isKnownRejectionCode(code)).toBe(true);
  });

  it.each([null, '', 'SOMETHING_NEW', 'client_not_synced'])(
    'does not know %p',
    code => {
      expect(isKnownRejectionCode(code)).toBe(false);
    },
  );
});
