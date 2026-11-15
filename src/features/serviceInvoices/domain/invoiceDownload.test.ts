import { downloadAvailability } from './invoiceDownload';

describe('downloadAvailability', () => {
  it.each([
    [{ hasFile: true, syncStatus: 'SYNCED', isOnline: true }, 'ready'],
    [
      { hasFile: true, syncStatus: 'SYNCED', isOnline: false },
      'needsConnection',
    ],
    [{ hasFile: false, syncStatus: 'SYNCED', isOnline: true }, 'noFile'],
    [{ hasFile: true, syncStatus: 'PENDING', isOnline: true }, 'notSentYet'],
    [{ hasFile: true, syncStatus: 'ERROR', isOnline: false }, 'notSentYet'],
  ] as const)('%j is %s', (context, expected) => {
    expect(downloadAvailability(context)).toBe(expected);
  });
});
