import { ApiError, apiClient } from 'shared/services/apiClient';

import type { FixedCostsSummary } from '../domain/fixedCostsSummary';

let lastLoadedSummary: FixedCostsSummary | null = null;

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
  lastLoadedSummary = {
    professionalExpenses: Number(result.professionalExpenses),
    personalExpenses: Number(result.personalExpenses),
    equipmentDepreciation: Number(result.depreciation),
    transportCost: Number(result.transport),
    total: Number(result.total),
  };
  return lastLoadedSummary;
}

export async function updateTransportCost(
  idToken: string,
  monthlyAmount: number,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  const current = lastLoadedSummary ?? (await fetchFixedCostsSummary(idToken));
  const automatic =
    current.professionalExpenses +
    current.personalExpenses +
    current.equipmentDepreciation;
  lastLoadedSummary = {
    ...current,
    transportCost: monthlyAmount,
    total: Math.round((automatic + monthlyAmount) * 100) / 100,
  };
  return lastLoadedSummary;
}
