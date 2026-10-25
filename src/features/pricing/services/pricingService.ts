import { fetchFixedCostsSummary, fixedCostsTotal } from 'features/calculator';
import { apiClient } from 'shared/services/apiClient';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { fetchPricingSettings } from './pricingSettingsService';
import { calculateHourlyRate, type HourlyRate } from '../domain/hourlyRate';
import type {
  PricingSettings,
  SavePricingSettingsDto,
} from '../domain/pricing.types';

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

  // Stand-in until the backend serves the hourly rate (US20): it reads the
  // goals and the month's fixed-costs summary, which already exist, and does
  // the math here. `null` means the goals are not configured yet, like the
  // 404 PRICING_SETTINGS_NOT_FOUND that `fetchPricingSettings` turns into null.
  async getHourlyRate(
    idToken: string,
    month: MonthPeriod,
  ): Promise<HourlyRate | null> {
    const [settings, costs] = await Promise.all([
      fetchPricingSettings(idToken),
      fetchFixedCostsSummary(idToken, month),
    ]);
    if (!settings) {
      return null;
    }

    return calculateHourlyRate({
      month,
      settings,
      fixedCosts: fixedCostsTotal(costs),
      variableCosts: costs.professionalExpenses,
      calculatedAt: new Date(),
    });
  },
};
