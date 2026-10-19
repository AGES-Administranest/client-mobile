import { apiClient } from 'shared/services/apiClient';

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
};
