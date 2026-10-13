// Same names as the backend's `PricingSettings` model. Only the "Metas" fields
// live here: fixed costs and depreciation are calculated by the backend, and
// transport has its own field in the "Custos fixos" card.
export type PricingSettings = {
  monthlyIncomeGoal: number;
  weeklyHours: number;
  safetyMarginPct: number;
};

export type SavePricingSettingsDto = PricingSettings;

export type PricingSettingsField = keyof PricingSettings;

export type PricingSettingsDraft = Record<PricingSettingsField, string>;

type NumberErrorCode = 'required' | 'invalid' | 'tooManyDecimals';

type PricingSettingsErrorCodes = {
  monthlyIncomeGoal: NumberErrorCode | 'notPositive' | 'tooLarge';
  weeklyHours: NumberErrorCode | 'notPositive' | 'tooHigh';
  safetyMarginPct: NumberErrorCode | 'outOfRange';
};

export type PricingSettingsErrors = {
  [Field in PricingSettingsField]?: PricingSettingsErrorCodes[Field];
};

export type PricingSettingsValidation =
  | { valid: true; settings: PricingSettings }
  | { valid: false; errors: PricingSettingsErrors };
