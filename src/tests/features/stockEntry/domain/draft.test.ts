import {
  entryFailure,
  entryStatus,
  type DraftSummary,
} from 'features/stockEntry/domain/draft';

const DRAFT: DraftSummary = {
  id: 'invoice-1',
  extractionStatus: 'SUCCESS',
  uploadedAt: '2026-09-28T12:00:00.000Z',
  updatedAt: '2026-09-28T12:00:00.000Z',
};

describe('entryStatus', () => {
  it.each<[string, Partial<DraftSummary>, ReturnType<typeof entryStatus>]>([
    ['a successful reading', {}, 'ready'],
    ['a failed reading', { extractionStatus: 'FAILED' }, 'failed'],
    ['a photo', { extractionStatus: 'MANUAL' }, 'photo'],
    ['a reading under way', { extractionStatus: 'PROCESSING' }, 'processing'],
    [
      'an upload that never arrived',
      { extractionStatus: 'PENDING', uploadedAt: undefined },
      'notUploaded',
    ],
  ])('%s', (_, changes, expected) => {
    expect(entryStatus({ ...DRAFT, ...changes })).toBe(expected);
  });
});

describe('entryFailure', () => {
  it('names why the reading failed', () => {
    expect(
      entryFailure({
        ...DRAFT,
        extractionStatus: 'FAILED',
        failureReason: 'NO_TEXT_LAYER',
      }),
    ).toBe('noTextLayer');
  });

  it('is empty for anything but a failure', () => {
    expect(entryFailure(DRAFT)).toBeNull();
  });
});
