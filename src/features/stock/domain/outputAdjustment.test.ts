import {
  digitsOnly,
  EMPTY_OUTPUT_ADJUSTMENT,
  isAdjustmentValid,
  parseQuantity,
  requiresWrittenReason,
  validateOutputAdjustment,
  type OutputAdjustmentDraft,
} from './outputAdjustment';

function draft(
  overrides: Partial<OutputAdjustmentDraft> = {},
): OutputAdjustmentDraft {
  return {
    itemId: 'item-1',
    quantity: '2',
    reason: 'loss',
    otherReason: '',
    ...overrides,
  };
}

describe('digitsOnly', () => {
  it('drops letters typed into the quantity field', () => {
    expect(digitsOnly('12a3')).toBe('123');
  });

  it('drops separators, signs and spaces', () => {
    expect(digitsOnly('-1,5')).toBe('15');
    expect(digitsOnly('1 000')).toBe('1000');
    expect(digitsOnly('2.5')).toBe('25');
  });

  it('returns an empty string when nothing typed is a digit', () => {
    expect(digitsOnly('abc')).toBe('');
  });
});

describe('parseQuantity', () => {
  it('reads the number the user typed', () => {
    expect(parseQuantity('12')).toBe(12);
  });

  it('is NaN for an empty field', () => {
    expect(parseQuantity('')).toBeNaN();
  });

  it('is NaN when the field holds no digit at all', () => {
    expect(parseQuantity('abc')).toBeNaN();
  });

  it('ignores a leading zero', () => {
    expect(parseQuantity('007')).toBe(7);
  });
});

describe('requiresWrittenReason', () => {
  it('is true only for "other"', () => {
    expect(requiresWrittenReason('other')).toBe(true);
    expect(requiresWrittenReason('loss')).toBe(false);
    expect(requiresWrittenReason('expiration')).toBe(false);
    expect(requiresWrittenReason('breakage')).toBe(false);
    expect(requiresWrittenReason(null)).toBe(false);
  });
});

describe('validateOutputAdjustment', () => {
  it('accepts a complete adjustment', () => {
    expect(validateOutputAdjustment(draft())).toEqual({});
  });

  it('requires every field on an untouched form', () => {
    const errors = validateOutputAdjustment(EMPTY_OUTPUT_ADJUSTMENT);

    expect(errors).toEqual({
      itemId: 'required',
      quantity: 'required',
      reason: 'required',
    });
  });

  it('requires an item', () => {
    expect(validateOutputAdjustment(draft({ itemId: null })).itemId).toBe(
      'required',
    );
  });

  it('requires a quantity', () => {
    expect(validateOutputAdjustment(draft({ quantity: '' })).quantity).toBe(
      'required',
    );
  });

  it('rejects a quantity of zero', () => {
    expect(validateOutputAdjustment(draft({ quantity: '0' })).quantity).toBe(
      'mustBePositive',
    );
  });

  it('requires a reason', () => {
    expect(validateOutputAdjustment(draft({ reason: null })).reason).toBe(
      'required',
    );
  });

  it('requires the written reason when "other" is picked', () => {
    const errors = validateOutputAdjustment(
      draft({ reason: 'other', otherReason: '' }),
    );

    expect(errors.otherReason).toBe('required');
  });

  it('rejects a written reason made only of spaces', () => {
    const errors = validateOutputAdjustment(
      draft({ reason: 'other', otherReason: '   ' }),
    );

    expect(errors.otherReason).toBe('required');
  });

  it('accepts "other" once the reason is written', () => {
    const errors = validateOutputAdjustment(
      draft({ reason: 'other', otherReason: 'Frasco trocado por engano' }),
    );

    expect(errors).toEqual({});
  });

  it('does not ask for a written reason on the other reasons', () => {
    const errors = validateOutputAdjustment(
      draft({ reason: 'breakage', otherReason: '' }),
    );

    expect(errors.otherReason).toBeUndefined();
  });
});

describe('isAdjustmentValid', () => {
  it('is true only when nothing failed', () => {
    expect(isAdjustmentValid({})).toBe(true);
    expect(isAdjustmentValid({ quantity: 'required' })).toBe(false);
  });
});
