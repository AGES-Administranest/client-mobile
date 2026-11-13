import type { ReportHistoryItem } from './report.types';
import { hasMorePages, mergeReportPages } from './reportHistory';

function report(id: string, generatedAt: string): ReportHistoryItem {
  return {
    id,
    kind: 'GENERAL_REPORT',
    fileName: `${id}.pdf`,
    fileBytesSize: 100,
    period: { from: '2026-10-01', to: '2026-10-31' },
    generatedAt,
  };
}

const ids = (list: ReportHistoryItem[]) => list.map(item => item.id);

describe('hasMorePages', () => {
  it.each([
    [0, 20, false],
    [19, 20, false],
    [20, 20, true],
    [1, 1, true],
  ])('%i received with a limit of %i → %s', (received, limit, expected) => {
    expect(hasMorePages(received, limit)).toBe(expected);
  });
});

describe('mergeReportPages', () => {
  it('keeps the newest generation first, whatever order the pages came in', () => {
    const merged = mergeReportPages(
      [report('old', '2026-10-01T10:00:00.000Z')],
      [
        report('newest', '2026-11-12T10:00:00.000Z'),
        report('middle', '2026-11-01T10:00:00.000Z'),
      ],
    );

    expect(ids(merged)).toEqual(['newest', 'middle', 'old']);
  });

  it('keeps a single copy of a report that came in two pages', () => {
    const merged = mergeReportPages(
      [report('a', '2026-11-12T10:00:00.000Z')],
      [
        report('a', '2026-11-12T10:00:00.000Z'),
        report('b', '2026-11-11T10:00:00.000Z'),
      ],
    );

    expect(ids(merged)).toEqual(['a', 'b']);
  });

  it('orders reports generated in the same instant by id, so the order is stable', () => {
    const merged = mergeReportPages(
      [report('b', '2026-11-12T10:00:00.000Z')],
      [report('a', '2026-11-12T10:00:00.000Z')],
    );

    expect(ids(merged)).toEqual(['a', 'b']);
  });

  it('returns an empty list when both pages are empty', () => {
    expect(mergeReportPages([], [])).toEqual([]);
  });
});
