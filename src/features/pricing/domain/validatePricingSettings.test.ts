import type { PricingSettingsDraft } from './pricing.types';
import {
  toPricingSettingsDraft,
  validatePricingSettings,
} from './validatePricingSettings';

const VALID: PricingSettingsDraft = {
  monthlyIncomeGoal: '8000',
  weeklyHours: '30',
  safetyMarginPct: '20',
};

function errorsFor(overrides: Partial<PricingSettingsDraft>) {
  const result = validatePricingSettings({ ...VALID, ...overrides });
  return result.valid ? {} : result.errors;
}

describe('validatePricingSettings', () => {
  it('returns the parsed settings for the Figma example', () => {
    expect(validatePricingSettings(VALID)).toEqual({
      valid: true,
      settings: {
        monthlyIncomeGoal: 8000,
        weeklyHours: 30,
        safetyMarginPct: 20,
      },
    });
  });

  it.each([
    ['8.000,50', 8000.5],
    ['8000,5', 8000.5],
    ['8000.5', 8000.5],
    [' 8000 ', 8000],
    ['8.000', 8000],
    ['1.500.000', 1500000],
    ['1.500.000,99', 1500000.99],
    ['999.999.999.999,99', 999999999999.99],
  ])('reads the income goal "%s" as %d', (input, expected) => {
    const result = validatePricingSettings({
      ...VALID,
      monthlyIncomeGoal: input,
    });
    expect(result).toEqual({
      valid: true,
      settings: expect.objectContaining({ monthlyIncomeGoal: expected }),
    });
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['abc', 'invalid'],
    ['1e3', 'invalid'],
    ['8.00,5', 'invalid'],
    ['8,000,5', 'invalid'],
    ['8000,505', 'tooManyDecimals'],
    ['8.000,505', 'tooManyDecimals'],
    ['0', 'notPositive'],
    ['-100', 'notPositive'],
    ['1.000.000.000.000', 'tooLarge'],
  ])('rejects the income goal "%s" as %s', (input, code) => {
    expect(errorsFor({ monthlyIncomeGoal: input })).toEqual({
      monthlyIncomeGoal: code,
    });
  });

  it.each([
    ['', 'required'],
    ['trinta', 'invalid'],
    ['0', 'notPositive'],
    ['0,0', 'notPositive'],
    ['-5', 'notPositive'],
    ['37.555', 'tooHigh'], // read as the thousands separator: 37555
    ['37.555', 'tooHigh'], // read as the thousands separator: 37555
    ['168,5', 'tooHigh'],
  ])('rejects the weekly hours "%s" as %s', (input, code) => {
    expect(errorsFor({ weeklyHours: input })).toEqual({ weeklyHours: code });
  });

  it.each(['0,5', '0.5', '37.5', '168'])(
    'accepts the weekly hours "%s"',
    input => {
      expect(
        validatePricingSettings({ ...VALID, weeklyHours: input }).valid,
      ).toBe(true);
    },
  );

  it.each([
    ['', 'required'],
    ['%', 'invalid'],
    ['-1', 'outOfRange'],
    ['-0,5', 'outOfRange'],
    ['12,345', 'tooManyDecimals'],
    ['100,5', 'outOfRange'],
    ['150', 'outOfRange'],
  ])('rejects the safety margin "%s" as %s', (input, code) => {
    expect(errorsFor({ safetyMarginPct: input })).toEqual({
      safetyMarginPct: code,
    });
  });

  it.each(['0', '100', '12,5'])('accepts the safety margin "%s"', input => {
    expect(
      validatePricingSettings({ ...VALID, safetyMarginPct: input }).valid,
    ).toBe(true);
  });

  it('reports every invalid field at once', () => {
    expect(
      validatePricingSettings({
        monthlyIncomeGoal: '',
        weeklyHours: '0',
        safetyMarginPct: '101',
      }),
    ).toEqual({
      valid: false,
      errors: {
        monthlyIncomeGoal: 'required',
        weeklyHours: 'notPositive',
        safetyMarginPct: 'outOfRange',
      },
    });
  });
});

describe('toPricingSettingsDraft', () => {
  it('starts empty without saved settings', () => {
    expect(toPricingSettingsDraft(null)).toEqual({
      monthlyIncomeGoal: '',
      weeklyHours: '',
      safetyMarginPct: '',
    });
  });

  it('writes saved decimals with a comma, and reads back the same values', () => {
    const settings = {
      monthlyIncomeGoal: 8000.5,
      weeklyHours: 37.5,
      safetyMarginPct: 20,
    };
    const draft = toPricingSettingsDraft(settings);

    expect(draft).toEqual({
      monthlyIncomeGoal: '8000,5',
      weeklyHours: '37,5',
      safetyMarginPct: '20',
    });
    expect(validatePricingSettings(draft)).toEqual({ valid: true, settings });
  });
});
