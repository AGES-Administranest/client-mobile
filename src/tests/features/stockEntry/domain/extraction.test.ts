import {
  readingFailure,
  type Extraction,
} from 'features/stockEntry/domain/extraction';

describe('readingFailure', () => {
  it.each<[Extraction['status'], Extraction['failureReason'], string | null]>([
    ['SUCCESS', undefined, null],
    ['MANUAL', undefined, 'photo'],
    ['FAILED', 'NO_TEXT_LAYER', 'noTextLayer'],
    ['FAILED', 'NO_TABLE_FOUND', 'noTableFound'],
    ['FAILED', 'TIMEOUT', 'timeout'],
    ['FAILED', 'UNREADABLE', 'unreadable'],
    ['FAILED', 'UNSUPPORTED_FORMAT', 'unreadable'],
    ['PROCESSING', undefined, 'unreadable'],
  ])('%s %s → %s', (status, failureReason, expected) => {
    expect(readingFailure({ status, failureReason, items: [] })).toBe(expected);
  });
});
