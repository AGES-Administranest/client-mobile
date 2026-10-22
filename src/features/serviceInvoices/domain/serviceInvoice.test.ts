import { formatIssueDate } from './serviceInvoice';

describe('formatIssueDate', () => {
  it.each([
    ['2026-04-22', '22/04/2026'],
    ['2026-01-05', '05/01/2026'],
    ['2026-12-31T00:00:00.000Z', '31/12/2026'],
    ['', ''],
    ['not-a-date', ''],
    ['22/04/2026', ''],
  ])('formats %p as %p', (input, expected) => {
    expect(formatIssueDate(input)).toBe(expected);
  });
});
