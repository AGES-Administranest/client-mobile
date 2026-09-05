import { validateOutputAdjustment, isAdjustmentValid } from './validateOutputAdjustment';

describe('validateOutputAdjustment', () => {
  it('error when reason was not selected', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: 2, reason: null }); 
    expect(errors.reason).toBe('required');
  });
  it('error when quantity is negative', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: -1, reason: 'breakage' }); 
    expect(errors.quantity).toBe('mustBePositive');
  });
  it('error when quantity is zero', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: 0, reason: 'loss' }); 
    expect(errors.quantity).toBe('mustBePositive');
  });
  it('error when quantity is undefined', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: NaN, reason: 'loss' }); 
    expect(errors.quantity).toBe('required');
  });
  it('error when itemId is empty', () => {
    const errors = validateOutputAdjustment({ itemId: '', quantity: 1, reason: 'expiration' }); 
    expect(errors.itemId).toBe('required');
  });
  it('valid when all fields are correct', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: 3, reason: 'expiration' }); 
    expect(isAdjustmentValid(errors)).toBe(true);
  });
});

describe('isAdjustmentValid', () => {
  it('returns true when there are no errors', () => {
    const errors = {};
    expect(isAdjustmentValid(errors)).toBe(true);
  });
  it('returns false when there are errors', () => {
    const errors = { itemId: 'required' };
    expect(isAdjustmentValid(errors)).toBe(false);
  });
});