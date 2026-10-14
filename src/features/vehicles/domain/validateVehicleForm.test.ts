import {
  BRAND_MAX_LENGTH,
  isVehicleFormValid,
  MAX_AVG_CONSUMPTION_KM_L,
  MAX_FUEL_PRICE,
  MODEL_MAX_LENGTH,
  validateVehicleForm,
  type VehicleFormValues,
} from './validateVehicleForm';

const VALID_FORM: VehicleFormValues = {
  brand: 'Fiat',
  model: 'Strada 2021',
  fuelType: 'FLEX',
  avgConsumptionKmL: '12.5',
  fuelPrice: '5.89',
};

describe('validateVehicleForm', () => {
  it('returns no errors for a valid form', () => {
    const errors = validateVehicleForm(VALID_FORM);
    expect(errors).toEqual({});
    expect(isVehicleFormValid(errors)).toBe(true);
  });

  it('validates required fields', () => {
    const errors = validateVehicleForm({
      ...VALID_FORM,
      brand: '   ',
      model: '',
      avgConsumptionKmL: '',
      fuelPrice: '',
    });

    expect(errors.brand).toBe('brandRequired');
    expect(errors.model).toBe('modelRequired');
    expect(errors.avgConsumptionKmL).toBe('avgConsumptionRequired');
    expect(errors.fuelPrice).toBe('fuelPriceRequired');
    expect(isVehicleFormValid(errors)).toBe(false);
  });

  it('validates max length on brand and model', () => {
    const errors = validateVehicleForm({
      ...VALID_FORM,
      brand: 'A'.repeat(BRAND_MAX_LENGTH + 1),
      model: 'B'.repeat(MODEL_MAX_LENGTH + 1),
    });

    expect(errors.brand).toBe('brandMaxLength');
    expect(errors.model).toBe('modelMaxLength');
  });

  it('validates invalid consumption values', () => {
    expect(
      validateVehicleForm({ ...VALID_FORM, avgConsumptionKmL: '0' })
        .avgConsumptionKmL,
    ).toBe('avgConsumptionInvalid');
    expect(
      validateVehicleForm({ ...VALID_FORM, avgConsumptionKmL: '-5' })
        .avgConsumptionKmL,
    ).toBe('avgConsumptionInvalid');
    expect(
      validateVehicleForm({ ...VALID_FORM, avgConsumptionKmL: 'abc' })
        .avgConsumptionKmL,
    ).toBe('avgConsumptionInvalid');
    expect(
      validateVehicleForm({
        ...VALID_FORM,
        avgConsumptionKmL: String(MAX_AVG_CONSUMPTION_KM_L + 1),
      }).avgConsumptionKmL,
    ).toBe('avgConsumptionInvalid');
  });

  it('validates invalid fuel price values', () => {
    expect(
      validateVehicleForm({ ...VALID_FORM, fuelPrice: '0' }).fuelPrice,
    ).toBe('fuelPriceInvalid');
    expect(
      validateVehicleForm({ ...VALID_FORM, fuelPrice: '-1' }).fuelPrice,
    ).toBe('fuelPriceInvalid');
    expect(
      validateVehicleForm({ ...VALID_FORM, fuelPrice: 'invalid' }).fuelPrice,
    ).toBe('fuelPriceInvalid');
    expect(
      validateVehicleForm({
        ...VALID_FORM,
        fuelPrice: String(MAX_FUEL_PRICE + 1),
      }).fuelPrice,
    ).toBe('fuelPriceInvalid');
  });

  it('accepts numbers with commas', () => {
    const errors = validateVehicleForm({
      ...VALID_FORM,
      avgConsumptionKmL: '12,5',
      fuelPrice: '5,899',
    });
    expect(errors).toEqual({});
  });
});

describe('validateVehicleForm decimal input', () => {
  it.each([
    ['12,5', '5,899'],
    ['12.50', '5.89'],
    ['8', '6'],
  ])('accepts consumption %s and price %s', (avgConsumptionKmL, fuelPrice) => {
    expect(
      validateVehicleForm({ ...VALID_FORM, avgConsumptionKmL, fuelPrice }),
    ).toEqual({});
  });

  it.each(['12,555', '12abc', '1.2.3', '-3', '0'])(
    'rejects consumption %s',
    avgConsumptionKmL => {
      expect(
        validateVehicleForm({ ...VALID_FORM, avgConsumptionKmL })
          .avgConsumptionKmL,
      ).toBe('avgConsumptionInvalid');
    },
  );

  it.each(['5,8999', '5x', '0', '100.001'])('rejects price %s', fuelPrice => {
    expect(validateVehicleForm({ ...VALID_FORM, fuelPrice }).fuelPrice).toBe(
      'fuelPriceInvalid',
    );
  });
});
