import type { Equipment } from './equipment.types';
import {
  buildCreateDto,
  buildUpdateDto,
  equipmentToFormValues,
  legacyUsefulLifeMonths,
  usefulLifeDisplay,
} from './equipmentFormMapping';
import type { NormalizedEquipmentForm } from './validateEquipmentForm';

const EQUIPMENT: Equipment = {
  id: 'eq-1',
  supplierId: null,
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: 1234.5,
  salvageValue: 0,
  acquisitionDate: '2022-03-01T00:00:00.000Z',
  usefulLifeMonths: 60,
  notes: 'Calibração anual',
  active: true,
  monthlyDepreciation: 20.58,
  currentValue: 100,
  usefulLifeUsedPct: 50,
  endOfLife: false,
};

const FORM: NormalizedEquipmentForm = {
  name: 'Vaporizador',
  purchaseValue: 8500,
  acquisitionDate: '2022-03-01',
  usefulLifeYears: 5,
  notes: 'nota',
};

describe('equipmentToFormValues', () => {
  it('fills the form from the equipment, months to years', () => {
    expect(equipmentToFormValues(EQUIPMENT)).toEqual({
      name: 'Vaporizador Matrx VIP 3000',
      purchaseValue: '1.234,50',
      acquisitionDate: '01/03/2022',
      usefulLifeYears: '5',
      notes: 'Calibração anual',
    });
  });

  it('shows null notes as empty', () => {
    expect(equipmentToFormValues({ ...EQUIPMENT, notes: null }).notes).toBe('');
  });

  it('leaves the useful life empty when the months are not whole years', () => {
    const legacy = { ...EQUIPMENT, usefulLifeMonths: 18 };

    expect(equipmentToFormValues(legacy).usefulLifeYears).toBe('');
    expect(legacyUsefulLifeMonths(legacy)).toBe(18);
    expect(legacyUsefulLifeMonths(EQUIPMENT)).toBeNull();
  });

  it('keeps the first day of the month on the same month', () => {
    expect(equipmentToFormValues(EQUIPMENT).acquisitionDate).toBe('01/03/2022');
  });
});

describe('buildCreateDto', () => {
  it('sends years as months', () => {
    expect(buildCreateDto(FORM)).toEqual({
      name: 'Vaporizador',
      purchaseValue: 8500,
      acquisitionDate: '2022-03-01',
      usefulLifeMonths: 60,
      notes: 'nota',
    });
  });

  it('sends 120 months without a useful life', () => {
    expect(
      buildCreateDto({ ...FORM, usefulLifeYears: null }).usefulLifeMonths,
    ).toBe(120);
  });

  it('omits empty notes and never sends salvageValue', () => {
    const dto = buildCreateDto({ ...FORM, notes: '' });

    expect(dto).not.toHaveProperty('notes');
    expect(dto).not.toHaveProperty('salvageValue');
  });
});

describe('buildUpdateDto', () => {
  const whole = { legacyMonths: null, usefulLifeUntouched: true };

  it('sends the edited values, years as months', () => {
    expect(buildUpdateDto(FORM, whole)).toEqual({
      name: 'Vaporizador',
      purchaseValue: 8500,
      acquisitionDate: '2022-03-01',
      usefulLifeMonths: 60,
      notes: 'nota',
    });
  });

  it('sends null notes when they were cleared', () => {
    expect(buildUpdateDto({ ...FORM, notes: '' }, whole).notes).toBeNull();
  });

  it('sends 120 months when the useful life was cleared', () => {
    expect(
      buildUpdateDto({ ...FORM, usefulLifeYears: null }, whole)
        .usefulLifeMonths,
    ).toBe(120);
  });

  describe('legacy months (not a whole number of years)', () => {
    it('omits the useful life while the field is untouched', () => {
      const dto = buildUpdateDto(
        { ...FORM, usefulLifeYears: null },
        { legacyMonths: 18, usefulLifeUntouched: true },
      );

      expect(dto).not.toHaveProperty('usefulLifeMonths');
    });

    it('sends years as months once the person typed them', () => {
      expect(
        buildUpdateDto(
          { ...FORM, usefulLifeYears: 2 },
          { legacyMonths: 18, usefulLifeUntouched: false },
        ).usefulLifeMonths,
      ).toBe(24);
    });
  });

  it('never sends salvageValue', () => {
    expect(buildUpdateDto(FORM, whole)).not.toHaveProperty('salvageValue');
  });
});

describe('usefulLifeDisplay', () => {
  it.each([
    [12, { unit: 'years', value: 1 }],
    [60, { unit: 'years', value: 5 }],
    [120, { unit: 'years', value: 10 }],
    [18, { unit: 'months', value: 18 }],
    [1, { unit: 'months', value: 1 }],
    [13, { unit: 'months', value: 13 }],
  ])('shows %p months as %p', (months, expected) => {
    expect(usefulLifeDisplay(months)).toEqual(expected);
  });
});
