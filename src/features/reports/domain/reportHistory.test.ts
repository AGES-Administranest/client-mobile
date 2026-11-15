import type { ReportHistoryItem } from './report.types';
import {
  bringsNewReports,
  hasMorePages,
  isDownloadLinkUsable,
  mergeReportPages,
  nextHistoryPage,
  toFileSize,
  withoutReport,
} from './reportHistory';

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

describe('nextHistoryPage', () => {
  it.each([
    [0, 20, 1],
    [20, 20, 2],
    [40, 20, 3],
    // One deleted after the first page: the first page is asked again, so the
    // report that moved into it is not skipped.
    [19, 20, 1],
    // One generated after the first page: the second page repeats one report.
    [21, 20, 2],
  ])('%i known with a limit of %i → page %i', (known, limit, expected) => {
    expect(nextHistoryPage(known, limit)).toBe(expected);
  });
});

describe('bringsNewReports', () => {
  const known = [report('a', '2026-11-12T10:00:00.000Z')];

  it('is true when the page has a report the list does not hold', () => {
    expect(
      bringsNewReports(known, [
        report('a', '2026-11-12T10:00:00.000Z'),
        report('b', '2026-11-11T10:00:00.000Z'),
      ]),
    ).toBe(true);
  });

  it.each([
    ['only known reports', [report('a', '2026-11-12T10:00:00.000Z')]],
    ['nothing', []],
  ])('is false when the page has %s', (_name, incoming) => {
    expect(bringsNewReports(known, incoming)).toBe(false);
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

describe('withoutReport', () => {
  it('removes only the report with that id', () => {
    const list = [
      report('a', '2026-11-12T10:00:00.000Z'),
      report('b', '2026-11-11T10:00:00.000Z'),
    ];

    expect(ids(withoutReport(list, 'a'))).toEqual(['b']);
  });

  it('keeps the list as it was when the id is not in it', () => {
    const list = [report('a', '2026-11-12T10:00:00.000Z')];

    expect(ids(withoutReport(list, 'missing'))).toEqual(['a']);
  });
});

describe('isDownloadLinkUsable', () => {
  const now = 1_000_000;

  it.each([
    [now + 5 * 60_000, true],
    [now + 30_001, true],
    [now + 30_000, false],
    [now, false],
    [now - 1, false],
  ])('a link that expires at %i → %s', (expiresAt, expected) => {
    expect(isDownloadLinkUsable(expiresAt, now)).toBe(expected);
  });
});

describe('toFileSize', () => {
  it.each([
    [0, { value: 0, unit: 'B' }],
    [1023, { value: 1023, unit: 'B' }],
    [1024, { value: 1, unit: 'KB' }],
    [184320, { value: 180, unit: 'KB' }],
    [1048575, { value: 1024, unit: 'KB' }],
    [1048576, { value: 1, unit: 'MB' }],
    [1572864, { value: 1.5, unit: 'MB' }],
  ])('%i bytes → %o', (bytes, expected) => {
    expect(toFileSize(bytes)).toEqual(expected);
  });
});
