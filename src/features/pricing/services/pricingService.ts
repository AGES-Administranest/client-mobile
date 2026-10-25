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
  SavePricingSettingsDto,
} from '../domain/pricing.types';

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
      error.code === 'PRICING_SETTINGS_NOT_FOUND'
    ) {
      return null;
    }
    throw error;
  }
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
};
