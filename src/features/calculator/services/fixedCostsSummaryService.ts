import { ApiError, apiClient } from 'shared/services/apiClient';

import type { FixedCostsSummary } from '../domain/fixedCostsSummary';

type FixedCostsPeriod = { month: number; year: number };

function requireToken(idToken: string): void {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
}

export async function fetchFixedCostsSummary(
  idToken: string,
  period?: FixedCostsPeriod,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  const query = period ? `?month=${period.month}&year=${period.year}` : '';
  const result = await apiClient.get<{
    professionalExpenses: string | number;
    personalExpenses: string | number;
    depreciation: string | number;
    transport: string | number;
    total: string | number;
  }>(`/fixed-costs/summary${query}`, { token: idToken });
  return {
    professionalExpenses: Number(result.professionalExpenses),
    personalExpenses: Number(result.personalExpenses),
    equipmentDepreciation: Number(result.depreciation),
    transportCost: Number(result.transport),
    total: Number(result.total),
  };
}

// The PATCH answers only with the transport, so the summary is read again
// for the month on screen to bring the backend total along.
export async function updateTransportCost(
  idToken: string,
  monthlyAmount: number,
  period?: FixedCostsPeriod,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  await apiClient.patch(
    '/pricing-settings/transport',
    { transportCostMonthly: monthlyAmount },
    { token: idToken },
  );
  return fetchFixedCostsSummary(idToken, period);
}
