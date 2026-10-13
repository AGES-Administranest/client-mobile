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

// The backend columns hold 2 decimal places, and the income goal is a
// DECIMAL(14, 2): anything past these limits would come back as a 400.
const MAX_DECIMAL_PLACES = 2;
const MAX_MONTHLY_INCOME_GOAL = 999_999_999_999.99;

type ParsedNumber = number | 'empty' | 'invalid' | 'tooManyDecimals';

// A pt-BR thousands separator: "8.000" or "1.500.000", dots between groups of
// exactly three digits.
const THOUSANDS = /^-?[1-9]\d{0,2}(\.\d{3})+$/;

// pt-BR: "8.000,50" is 8000.5 and "8.000" is 8000. Otherwise the dot is the
// decimal point, as keyboards outside pt-BR type it ("37.5"). Strict on
// purpose: `Number` alone would accept "1e3" or "0x10".
function parseNumber(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return 'empty';
  }

  let normalized = trimmed;
  if (trimmed.includes(',')) {
    const [integer, ...fraction] = trimmed.split(',');
    if (
      fraction.length > 1 ||
      (integer.includes('.') && !THOUSANDS.test(integer))
    ) {
      return 'invalid';
    }
    normalized = `${integer.replace(/\./g, '')}.${fraction[0]}`;
  } else if (THOUSANDS.test(trimmed)) {
    normalized = trimmed.replace(/\./g, '');
  }

  const match = /^-?\d+(?:\.(\d+))?$/.exec(normalized);
  if (!match) {
    return 'invalid';
  }
  if ((match[1]?.length ?? 0) > MAX_DECIMAL_PLACES) {
    return 'tooManyDecimals';
  }
  return Number(normalized);
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
  } else if (monthlyIncomeGoal === 'tooManyDecimals') {
    errors.monthlyIncomeGoal = 'tooManyDecimals';
  } else if (monthlyIncomeGoal <= 0) {
    errors.monthlyIncomeGoal = 'notPositive';
  } else if (monthlyIncomeGoal > MAX_MONTHLY_INCOME_GOAL) {
    errors.monthlyIncomeGoal = 'tooLarge';
  }

  const weeklyHours = parseNumber(draft.weeklyHours);
  if (weeklyHours === 'empty') {
    errors.weeklyHours = 'required';
  } else if (weeklyHours === 'invalid') {
    errors.weeklyHours = 'invalid';
  } else if (weeklyHours === 'tooManyDecimals') {
    errors.weeklyHours = 'tooManyDecimals';
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
  } else if (safetyMarginPct === 'tooManyDecimals') {
    errors.safetyMarginPct = 'tooManyDecimals';
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
