import { ApiError, apiClient } from 'shared/services/apiClient';

import type { FixedCostsSummary } from '../domain/fixedCostsSummary';

function requireToken(idToken: string): void {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
}

export async function fetchFixedCostsSummary(
  idToken: string,
  period?: { month: number; year: number },
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

export async function updateTransportCost(
  idToken: string,
  monthlyAmount: number,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  await apiClient.patch(
    '/pricing-settings/transport',
    { transportCostMonthly: monthlyAmount },
    { token: idToken },
  );
  return fetchFixedCostsSummary(idToken);
}
