import type {
  PricingSettings,
  PricingSettingsDraft,
  PricingSettingsErrors,
  PricingSettingsValidation,
} from './pricing.types';

export const PRICING_SETTINGS_FIELDS = [
  'monthlyIncomeGoal',
  'weeklyHours',
  'safetyMarginPct',
] as const;

export const EMPTY_PRICING_SETTINGS_DRAFT: PricingSettingsDraft = {
  monthlyIncomeGoal: '',
  weeklyHours: '',
  safetyMarginPct: '',
};

const HOURS_IN_A_WEEK = 168;
const MAX_MARGIN_PCT = 100;

type ParsedNumber = number | 'empty' | 'invalid';

// pt-BR: "8.000,50" is 8000.5. Without a comma the dot is the decimal point,
// as keyboards outside pt-BR type it. Strict on purpose: `Number` alone would
// accept "1e3" or "0x10".
function parseNumber(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return 'empty';
  }
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : 'invalid';
}

export function validatePricingSettings(
  draft: PricingSettingsDraft,
): PricingSettingsValidation {
  const errors: PricingSettingsErrors = {};

  const monthlyIncomeGoal = parseNumber(draft.monthlyIncomeGoal);
  if (monthlyIncomeGoal === 'empty') {
    errors.monthlyIncomeGoal = 'required';
  } else if (monthlyIncomeGoal === 'invalid') {
    errors.monthlyIncomeGoal = 'invalid';
  } else if (monthlyIncomeGoal <= 0) {
    errors.monthlyIncomeGoal = 'notPositive';
  }

  const weeklyHours = parseNumber(draft.weeklyHours);
  if (weeklyHours === 'empty') {
    errors.weeklyHours = 'required';
  } else if (weeklyHours === 'invalid') {
    errors.weeklyHours = 'invalid';
  } else if (weeklyHours <= 0) {
    errors.weeklyHours = 'notPositive';
  } else if (weeklyHours > HOURS_IN_A_WEEK) {
    errors.weeklyHours = 'tooHigh';
  }

  const safetyMarginPct = parseNumber(draft.safetyMarginPct);
  if (safetyMarginPct === 'empty') {
    errors.safetyMarginPct = 'required';
  } else if (safetyMarginPct === 'invalid') {
    errors.safetyMarginPct = 'invalid';
  } else if (safetyMarginPct < 0 || safetyMarginPct > MAX_MARGIN_PCT) {
    errors.safetyMarginPct = 'outOfRange';
  }

  if (
    typeof monthlyIncomeGoal !== 'number' ||
    typeof weeklyHours !== 'number' ||
    typeof safetyMarginPct !== 'number' ||
    Object.keys(errors).length > 0
  ) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    settings: { monthlyIncomeGoal, weeklyHours, safetyMarginPct },
  };
}

export function toPricingSettingsDraft(
  settings: PricingSettings | null | undefined,
): PricingSettingsDraft {
  if (!settings) {
    return EMPTY_PRICING_SETTINGS_DRAFT;
  }
  const toText = (value: number) => String(value).replace('.', ',');
  return {
    monthlyIncomeGoal: toText(settings.monthlyIncomeGoal),
    weeklyHours: toText(settings.weeklyHours),
    safetyMarginPct: toText(settings.safetyMarginPct),
  };
}
