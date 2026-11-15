import { hasReportRecords } from './reportAvailability';

describe('hasReportRecords', () => {
  it.each([
    [0, false],
    [1, true],
    [42, true],
  ])('total %i -> %s', (total, expected) => {
    expect(hasReportRecords({ total })).toBe(expected);
  });
});
