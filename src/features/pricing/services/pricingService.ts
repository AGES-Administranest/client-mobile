import { ApiError, apiClient } from 'shared/services/apiClient';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { fetchPricingSettings } from './pricingSettingsService';
import {
  toHourlyRate,
  type HourlyRate,
  type HourlyRateResponse,
} from '../domain/hourlyRate';
import {
  toHourlyRateHistory,
  type HourlyRateHistoryMonthResponse,
  type HourlyRateHistoryResponse,
  type HourlyRatePeriod,
} from '../domain/hourlyRateHistory';
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

// A month without a stored calculation is an empty month in the history, not
// a failure.
async function fetchHourlyRateHistoryMonth(
  idToken: string,
  { month, year }: MonthPeriod,
): Promise<HourlyRateHistoryMonthResponse | null> {
  try {
    return await apiClient.get<HourlyRateHistoryMonthResponse>(
      `/pricing/hourly-rate/history/${year}/${month}`,
      { token: idToken },
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === 'HOURLY_RATE_SNAPSHOT_NOT_FOUND'
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

  // One entry per month with a stored calculation. The list carries only the
  // hour value; the rest of a month is `getHourlyRateHistoryMonth`.
  async getHourlyRateHistory(idToken: string): Promise<HourlyRatePeriod[]> {
    const response = await apiClient.get<HourlyRateHistoryResponse>(
      '/pricing/hourly-rate/history',
      { token: idToken },
    );

    return toHourlyRateHistory(response);
  },

  // A month as it was calculated, with the goals it used. `null` when the
  // month has no stored calculation.
  async getHourlyRateHistoryMonth(
    idToken: string,
    period: MonthPeriod,
  ): Promise<HourlyRate | null> {
    const response = await fetchHourlyRateHistoryMonth(idToken, period);
    if (!response) {
      return null;
    }

    const { parameters, ...rate } = response;
    return toHourlyRate(rate, {
      monthlyIncomeGoal: Number(parameters.monthlyIncomeGoal),
      weeklyHours: Number(parameters.weeklyHours),
      safetyMarginPct: Number(parameters.safetyMarginPct),
    });
  },
};
