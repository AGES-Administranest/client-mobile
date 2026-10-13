import { ApiError, apiClient } from 'shared/services/apiClient';

import type { PricingSettings } from '../domain/pricing.types';

// Quem ainda não configurou pró-labore, margem e jornada recebe 404
// PRICING_SETTINGS_NOT_FOUND: não é falha, é o estado inicial da Calculadora.
// Por isso vira `null` aqui. Qualquer outro erro, inclusive um 404 sem esse
// código (rota inexistente), chega a quem chama.
export async function fetchPricingSettings(
  idToken: string,
): Promise<PricingSettings | null> {
  try {
    return await apiClient.get<PricingSettings>('/pricing-settings', {
      token: idToken,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === 'PRICING_SETTINGS_NOT_FOUND'
    ) {
      return null;
    }
    throw error;
  }
}
