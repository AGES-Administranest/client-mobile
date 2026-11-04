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

// --- US21: Simulação de Valor Mínimo por Procedimento ---

/** Item de insumo na requisição da simulação */
export type ProcedureSupplyDto = {
  itemId: string;
  quantity: number;
};

/** DTO de entrada para POST /pricing/procedure-estimate */
export type ProcedureEstimateDto = {
  durationMinutes: number;
  clientId?: string | null;
  supplies?: ProcedureSupplyDto[];
};

/** DTO de resposta do backend para POST /pricing/procedure-estimate */
export type ProcedureEstimateResponse = {
  minimumPrice: string;
  breakEvenPrice: string;
  hoursCost: string;
  tripCost: string;
  suppliesCost: string;
  hourlyRateUsed: string;
  minimumHourlyRateUsed: string;
  tripEstimateAvailable: boolean;
  tripEstimateDays: number;
  suppliesWithoutCost: string[];
  durationMinutes: number;
  month: number;
  year: number;
};

/** Tipo de domínio mapeado (valores numéricos prontos para apresentação) */
export type ProcedureEstimate = {
  minimumPrice: number;
  breakEvenPrice: number;
  hoursCost: number;
  tripCost: number;
  suppliesCost: number;
  hourlyRateUsed: number;
  minimumHourlyRateUsed: number;
  tripEstimateAvailable: boolean;
  tripEstimateDays: number;
  suppliesWithoutCost: string[];
  durationMinutes: number;
  month: number;
  year: number;
};

/** Insumo selecionado no formulário da simulação */
export type ProcedureSelectedSupply = {
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
};
