import {
  EMPTY_FIXED_COST_DRAFT,
  isFixedCostDraftValid,
  parseMonthlyAmount,
  toFixedCostPayload,
  validateFixedCostDraft,
  type FixedCostDraft,
} from './validateFixedCostForm';

const VALID_DRAFT: FixedCostDraft = {
  description: 'Aluguel do consultório',
  monthlyAmount: '1.200,50',
  category: 'RENT',
};

describe('parseMonthlyAmount', () => {
  it.each([
    ['1.200,50', 1200.5],
    ['50', 50],
    ['0,99', 0.99],
    ['', null],
    ['   ', null],
    ['abc', null],
    ['12,34,56', null],
  ])('parses %s as %p', (input, expected) => {
    expect(parseMonthlyAmount(input)).toBe(expected);
  });
});

describe('validateFixedCostDraft', () => {
  it('accepts a fully filled, valid draft', () => {
    expect(validateFixedCostDraft(VALID_DRAFT)).toEqual({});
  });

  it('requires every field on an empty draft', () => {
    expect(validateFixedCostDraft(EMPTY_FIXED_COST_DRAFT)).toEqual({
      description: 'required',
      monthlyAmount: 'required',
      category: 'required',
    });
  });

  it('requires a description that is not just whitespace', () => {
    const errors = validateFixedCostDraft({
      ...VALID_DRAFT,
      description: '   ',
    });
    expect(errors.description).toBe('required');
  });

  it.each([
    ['empty', '', 'required'],
    ['non-numeric', 'abc', 'invalid'],
    ['zero', '0', 'invalid'],
    ['negative', '-50', 'invalid'],
  ])('rejects a %s monthly amount', (_case, monthlyAmount, expected) => {
    const errors = validateFixedCostDraft({ ...VALID_DRAFT, monthlyAmount });
    expect(errors.monthlyAmount).toBe(expected);
  });

  it('requires a category to be picked', () => {
    const errors = validateFixedCostDraft({ ...VALID_DRAFT, category: null });
    expect(errors.category).toBe('required');
  });
});

describe('isFixedCostDraftValid', () => {
  it('is valid only without any field error', () => {
    expect(isFixedCostDraftValid({})).toBe(true);
    expect(isFixedCostDraftValid({ description: 'required' })).toBe(false);
  });
});

describe('toFixedCostPayload', () => {
  it('trims the description and parses the amount', () => {
    expect(
      toFixedCostPayload({ ...VALID_DRAFT, description: '  Aluguel  ' }),
    ).toEqual({
      description: 'Aluguel',
      monthlyAmount: 1200.5,
      category: 'RENT',
    });
  });
});
