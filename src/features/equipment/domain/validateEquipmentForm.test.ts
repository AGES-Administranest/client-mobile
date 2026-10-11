import {
  validateEquipmentForm,
  type EquipmentFormValues,
} from './validateEquipmentForm';

const TODAY = '2026-10-11';

const VALID: EquipmentFormValues = {
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: '8.500,00',
  acquisitionDate: '01/03/2022',
  usefulLifeYears: '10',
  notes: 'Calibração anual',
};

function validate(overrides: Partial<EquipmentFormValues> = {}) {
  return validateEquipmentForm({ ...VALID, ...overrides }, TODAY);
}

describe('validateEquipmentForm', () => {
  it('accepts a complete form and normalizes it', () => {
    expect(validate()).toEqual({
      errors: {},
      normalized: {
        name: 'Vaporizador Matrx VIP 3000',
        purchaseValue: 8500,
        acquisitionDate: '2022-03-01',
        usefulLifeYears: 10,
        notes: 'Calibração anual',
      },
    });
  });

  it('accepts only the required fields', () => {
    const result = validate({ usefulLifeYears: '', notes: '' });

    expect(result.errors).toEqual({});
    expect(result.normalized).toMatchObject({
      usefulLifeYears: null,
      notes: '',
    });
  });

  it('trims the name and the notes', () => {
    const result = validate({ name: '  Bomba  ', notes: '  nota  ' });

    expect(result.normalized).toMatchObject({ name: 'Bomba', notes: 'nota' });
  });

  it('has no normalized values while there is any error', () => {
    expect(validate({ name: '' }).normalized).toBeNull();
  });

  describe('name', () => {
    it.each([
      ['', 'required'],
      ['   ', 'required'],
      ['A', 'tooShort'],
      [' A ', 'tooShort'],
      ['x'.repeat(121), 'tooLong'],
    ])('rejects %p as %s', (name, code) => {
      expect(validate({ name }).errors.name).toBe(code);
    });

    it.each(['AB', 'x'.repeat(120)])('accepts the boundary %p', name => {
      expect(validate({ name }).errors.name).toBeUndefined();
    });
  });

  describe('purchaseValue', () => {
    it.each([
      ['', 'required'],
      ['   ', 'required'],
      ['0', 'mustBePositive'],
      ['0,00', 'mustBePositive'],
      ['-5', 'mustBePositive'],
      ['-5,00', 'mustBePositive'],
      ['abc', 'invalidNumber'],
      ['10,5,3', 'invalidNumber'],
      ['10,333', 'invalidNumber'],
      ['R$ 10', 'invalidNumber'],
    ])('rejects %p as %s', (purchaseValue, code) => {
      expect(validate({ purchaseValue }).errors.purchaseValue).toBe(code);
    });

    it.each([
      ['10,33', 10.33],
      ['1.234,56', 1234.56],
      ['0,01', 0.01],
      ['5', 5],
      ['1.000.000,00', 1000000],
    ])('reads %p as %p', (purchaseValue, expected) => {
      const result = validate({ purchaseValue });

      expect(result.errors.purchaseValue).toBeUndefined();
      expect(result.normalized?.purchaseValue).toBe(expected);
    });
  });

  describe('acquisitionDate', () => {
    it('is required', () => {
      expect(validate({ acquisitionDate: '' }).errors.acquisitionDate).toBe(
        'required',
      );
    });

    it.each(['15/10', '31/02/2026', '00/10/2026', '15/13/2026', '1510202'])(
      'rejects %p as invalid',
      acquisitionDate => {
        expect(validate({ acquisitionDate }).errors.acquisitionDate).toBe(
          'invalidDate',
        );
      },
    );

    it('accepts today', () => {
      const result = validate({ acquisitionDate: '11/10/2026' });

      expect(result.errors.acquisitionDate).toBeUndefined();
      expect(result.normalized?.acquisitionDate).toBe('2026-10-11');
    });

    it('rejects tomorrow', () => {
      expect(
        validate({ acquisitionDate: '12/10/2026' }).errors.acquisitionDate,
      ).toBe('futureDate');
    });

    it('rejects a later month and a later year', () => {
      expect(
        validate({ acquisitionDate: '01/11/2026' }).errors.acquisitionDate,
      ).toBe('futureDate');
      expect(
        validate({ acquisitionDate: '01/01/2027' }).errors.acquisitionDate,
      ).toBe('futureDate');
    });

    it('keeps the first day of the month on the same month', () => {
      expect(
        validate({ acquisitionDate: '01/03/2022' }).normalized?.acquisitionDate,
      ).toBe('2022-03-01');
    });
  });

  describe('usefulLifeYears', () => {
    it('is optional', () => {
      const result = validate({ usefulLifeYears: '' });

      expect(result.errors.usefulLifeYears).toBeUndefined();
      expect(result.normalized?.usefulLifeYears).toBeNull();
    });

    it.each([
      ['0', 'mustBePositive'],
      ['-3', 'mustBePositive'],
      ['2,5', 'mustBeInteger'],
      ['2.5', 'mustBeInteger'],
      ['abc', 'invalidNumber'],
      ['101', 'tooLarge'],
    ])('rejects %p as %s', (usefulLifeYears, code) => {
      expect(validate({ usefulLifeYears }).errors.usefulLifeYears).toBe(code);
    });

    it.each([
      ['1', 1],
      ['10', 10],
      ['100', 100],
    ])('reads %p as %p years', (usefulLifeYears, expected) => {
      expect(validate({ usefulLifeYears }).normalized?.usefulLifeYears).toBe(
        expected,
      );
    });
  });

  describe('notes', () => {
    it('accepts up to 1000 characters and rejects more', () => {
      expect(
        validate({ notes: 'x'.repeat(1000) }).errors.notes,
      ).toBeUndefined();
      expect(validate({ notes: 'x'.repeat(1001) }).errors.notes).toBe(
        'tooLong',
      );
    });
  });

  it('reports every field error at once', () => {
    expect(
      validate({
        name: '',
        purchaseValue: '0',
        acquisitionDate: '12/10/2026',
        usefulLifeYears: '0',
      }).errors,
    ).toEqual({
      name: 'required',
      purchaseValue: 'mustBePositive',
      acquisitionDate: 'futureDate',
      usefulLifeYears: 'mustBePositive',
    });
  });
});
