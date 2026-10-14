import type {
  PricingSettings,
  SavePricingSettingsDto,
} from '../domain/pricing.types';

export const pricingService = {
  // Stand-in until the backend exposes the pricing settings route (only the
  // `PricingSettings` model exists there so far). The real call keeps this
  // signature: `apiClient.put<PricingSettings>('/pricing-settings', dto,
  // { token: idToken })`.
  saveSettings(
    idToken: string,
    dto: SavePricingSettingsDto,
  ): Promise<PricingSettings> {
    return Promise.resolve({ ...dto });
  },
};
