import { apiClient } from 'shared/services/apiClient';

import type { ReportAvailability } from '../domain/reportAvailability';
import type { ReportPeriod } from '../domain/reportPeriod';

// The person is waiting on the tap that asked for the report.
const FETCH_TIMEOUT_MS = 10_000;

export function fetchReportAvailability(
  idToken: string,
  period: ReportPeriod,
): Promise<ReportAvailability> {
  const query = new URLSearchParams({ from: period.from, to: period.to });

  return apiClient.get<ReportAvailability>(
    `/reports/availability?${query.toString()}`,
    { token: idToken, timeoutMs: FETCH_TIMEOUT_MS },
  );
}
