import { ApiError, apiClient } from 'shared/services/apiClient';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { fetchPricingSettings } from './pricingSettingsService';
import {
  toHourlyRate,
  type HourlyRate,
  type HourlyRateResponse,
} from '../domain/hourlyRate';
import type {
  PricingSettings,
  ProcedureEstimateDto,
  ProcedureEstimateResponse,
  SavePricingSettingsDto,
} from '../domain/pricing.types';

/**
 * Detecta se um erro retornado pela API ou serviço indica falta de configuração de honorários
 * (409 Conflict ou PRICING_SETTINGS_NOT_FOUND, como a US20 trata).
 */
export function isPricingUnconfiguredError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status === 409 ||
      error.code === 'PRICING_SETTINGS_NOT_FOUND' ||
      (error.status === 404 && error.code === 'PRICING_SETTINGS_NOT_FOUND')
    );
  }
  return false;
}

// Like `fetchPricingSettings`, the 404 PRICING_SETTINGS_NOT_FOUND is the
// calculator's initial state, not a failure.
async function fetchHourlyRate(
  idToken: string,
  { month, year }: MonthPeriod,
): Promise<HourlyRateResponse | null> {
  try {
    return await apiClient.get<HourlyRateResponse>(
      `/pricing/hourly-rate?month=${month}&year=${year}`,
      { token: idToken },
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'PRICING_SETTINGS_NOT_FOUND' || error.status === 409)
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Chama o endpoint real do backend POST /pricing/procedure-estimate (US21).
 */
async function fetchProcedureEstimate(
  idToken: string,
  dto: ProcedureEstimateDto,
): Promise<ProcedureEstimateResponse> {
  return apiClient.post<ProcedureEstimateResponse>(
    '/pricing/procedure-estimate',
    dto,
    { token: idToken },
  );
}

export const pricingService = {
  // Creates the goals on the first call and overwrites them after that; the
  // backend answers with the saved values, so there is nothing to read again.
  saveSettings(
    idToken: string,
    dto: SavePricingSettingsDto,
  ): Promise<PricingSettings> {
    return apiClient.put<PricingSettings>('/pricing-settings', dto, {
      token: idToken,
    });
  },

  // The rate comes from GET /pricing/hourly-rate (US20). The goals are read
  // alongside it because the screen edits them in place. `null` means they
  // are not configured yet.
  async getHourlyRate(
    idToken: string,
    month: MonthPeriod,
  ): Promise<HourlyRate | null> {
    const [settings, response] = await Promise.all([
      fetchPricingSettings(idToken),
      fetchHourlyRate(idToken, month),
    ]);
    if (!settings || !response) {
      return null;
    }

    return toHourlyRate(response, settings);
  },

  /**
   * Simula a precificação mínima de um procedimento (US21).
   * Chama o endpoint real do backend POST /pricing/procedure-estimate.
   */
  estimateProcedure(
    idToken: string,
    dto: ProcedureEstimateDto,
  ): Promise<ProcedureEstimateResponse> {
    return fetchProcedureEstimate(idToken, dto);
  },
};
