import { validateOutputAdjustment, isAdjustmentValid } from './validateOutputAdjustment';

describe('validateOutputAdjustment', () => {
  it('error when reason was not selected', () => {
    const errors = validateOutputAdjustment({ itemId: '1', quantity: 2, reason: null }); 
    expect(errors.reason).toBe('required');
  });
});