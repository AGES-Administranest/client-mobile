import { ApiError } from 'shared/services/apiClient';

import type { FixedCostsSummary } from '../domain/fixedCostsSummary';

// Stand-in: o backend ainda não expõe o resumo de custos fixos mensais. As
// assinaturas (idToken primeiro, sem userId) são as da chamada real, que
// vira `apiClient.get('/fixed-cost/summary')` e
// `apiClient.patch('/fixed-cost/transport', { monthlyAmount })`. O total é
// sempre devolvido pelo "servidor"; quem chama nunca o recalcula.
let stored: FixedCostsSummary = {
  professionalExpenses: 1225,
  personalExpenses: 860,
  equipmentDepreciation: 189.08,
  transportCost: 350,
  total: 2624.08,
};

function requireToken(idToken: string): void {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
}

export async function fetchFixedCostsSummary(
  idToken: string,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  return stored;
}

export async function updateTransportCost(
  idToken: string,
  monthlyAmount: number,
): Promise<FixedCostsSummary> {
  requireToken(idToken);
  const automatic =
    stored.professionalExpenses +
    stored.personalExpenses +
    stored.equipmentDepreciation;
  stored = {
    ...stored,
    transportCost: monthlyAmount,
    total: Math.round((automatic + monthlyAmount) * 100) / 100,
  };
  return stored;
}
