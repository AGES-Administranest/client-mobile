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
    ['0', 'notPositive'],
    ['-100', 'notPositive'],
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
    ['168,5', 'tooHigh'],
  ])('rejects the weekly hours "%s" as %s', (input, code) => {
    expect(errorsFor({ weeklyHours: input })).toEqual({ weeklyHours: code });
  });

  it.each(['0,5', '168'])('accepts the weekly hours "%s"', input => {
    expect(
      validatePricingSettings({ ...VALID, weeklyHours: input }).valid,
    ).toBe(true);
  });

  it.each([
    ['', 'required'],
    ['%', 'invalid'],
    ['-1', 'outOfRange'],
    ['-0,5', 'outOfRange'],
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
