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

type PricingSettingsErrorCodes = {
  monthlyIncomeGoal: 'required' | 'invalid' | 'notPositive';
  weeklyHours: 'required' | 'invalid' | 'notPositive' | 'tooHigh';
  safetyMarginPct: 'required' | 'invalid' | 'outOfRange';
};

export type PricingSettingsErrors = {
  [Field in PricingSettingsField]?: PricingSettingsErrorCodes[Field];
};

export type PricingSettingsValidation =
  | { valid: true; settings: PricingSettings }
  | { valid: false; errors: PricingSettingsErrors };
