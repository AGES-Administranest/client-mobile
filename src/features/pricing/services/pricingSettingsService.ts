import { ApiError, apiClient } from 'shared/services/apiClient';

export type PricingSettings = {
  monthlyNetIncomeGoal: number;
  weeklyAvailableHours: number;
  safetyMarginPercent: number;
};

// Quem ainda não configurou pró-labore, margem e jornada recebe 404: não é
// falha, é o estado inicial da Calculadora. Por isso vira `null` aqui, e só os
// outros erros chegam a quem chama.
export async function fetchPricingSettings(
  idToken: string,
): Promise<PricingSettings | null> {
  try {
    return await apiClient.get<PricingSettings>('/pricing-settings', {
      token: idToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
