import { isProductionBuild } from 'shared/utils/appEnv';

import type { ReportHistoryItem } from '../domain/report.types';

// The history still comes from this list: in production it would show made-up
// reports on a real account. Once fetchReportHistory calls the API, this
// becomes `true`.
export function isReportHistoryAvailable(): boolean {
  return !isProductionBuild();
}

const STUB_HISTORY: ReportHistoryItem[] = [
  {
    id: 'report-2',
    fileName: 'administranest_financeiro_2026-08.pdf',
    generatedAt: '2026-08-18T12:00:00.000Z',
  },
  {
    id: 'report-1',
    fileName: 'administranest_atendimentos_2026-07.pdf',
    generatedAt: '2026-08-17T12:00:00.000Z',
  },
];

// Stand-in for GET /reports, keeping the signature the real call will have.
export function fetchReportHistory(
  _idToken: string,
): Promise<ReportHistoryItem[]> {
  return Promise.resolve(STUB_HISTORY);
}
