import {
  DEFAULT_USEFUL_LIFE_MONTHS,
  previewDepreciation,
} from './previewDepreciation';

// Os casos de "backend" abaixo repetem equipment/domain/depreciation.spec.ts do
// back (as = 2026-06-15), para os dois lados darem o mesmo número.
const TODAY = '2026-06-15';

describe('previewDepreciation', () => {
  describe('mesmos casos do backend', () => {
    it('uses the configured useful life', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          usefulLifeMonths: 24,
          acquisitionDate: '2025-06-15',
          today: TODAY,
        }),
      ).toEqual({ monthlyDepreciation: 50, lifeEnded: false });
    });

    it('defaults to 120 months', () => {
      expect(DEFAULT_USEFUL_LIFE_MONTHS).toBe(120);
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          acquisitionDate: '2025-06-15',
          today: TODAY,
        }),
      ).toEqual({ monthlyDepreciation: 10, lifeEnded: false });
    });

    it('is zero once the useful life ended, keeping the salvage value', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          salvageValue: 200,
          usefulLifeMonths: 10,
          acquisitionDate: '2025-06-15',
          today: TODAY,
        }),
      ).toEqual({ monthlyDepreciation: 0, lifeEnded: true });
    });

    it('is zero when the elapsed months equal the life', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          salvageValue: 200,
          usefulLifeMonths: 12,
          acquisitionDate: '2025-06-15',
          today: TODAY,
        }),
      ).toEqual({ monthlyDepreciation: 0, lifeEnded: true });
    });

    it('does not count the acquisition month', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          usefulLifeMonths: 12,
          acquisitionDate: '2026-06-01',
          today: TODAY,
        }),
      ).toEqual({ monthlyDepreciation: 100, lifeEnded: false });
    });
  });

  describe('years', () => {
    it('is linear, with years converted to months', () => {
      expect(
        previewDepreciation({ purchaseValue: 12000, usefulLifeYears: 5 }),
      ).toEqual({ monthlyDepreciation: 200, lifeEnded: false });
    });

    it('defaults to 10 years without a useful life', () => {
      expect(previewDepreciation({ purchaseValue: 8500 })).toEqual({
        monthlyDepreciation: 70.83,
        lifeEnded: false,
      });
      expect(
        previewDepreciation({ purchaseValue: 8500, usefulLifeYears: null }),
      ).toEqual({ monthlyDepreciation: 70.83, lifeEnded: false });
    });

    it('rounds to cents', () => {
      expect(
        previewDepreciation({ purchaseValue: 1000, usefulLifeYears: 3 }),
      ).toMatchObject({ monthlyDepreciation: 27.78 });
      expect(
        previewDepreciation({ purchaseValue: 100, usefulLifeYears: 1 }),
      ).toMatchObject({ monthlyDepreciation: 8.33 });
      expect(
        previewDepreciation({ purchaseValue: 0.01, usefulLifeYears: 1 }),
      ).toMatchObject({ monthlyDepreciation: 0 });
    });

    it('prefers the months of a legacy useful life over the years', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1800,
          usefulLifeYears: 10,
          usefulLifeMonths: 18,
        }),
      ).toMatchObject({ monthlyDepreciation: 100 });
    });
  });

  describe('salvage value', () => {
    it('depreciates only what is above the salvage value', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          salvageValue: 200,
          usefulLifeYears: 1,
        }),
      ).toMatchObject({ monthlyDepreciation: 83.33 });
    });

    it('cannot be calculated when the salvage value reaches the purchase', () => {
      expect(
        previewDepreciation({ purchaseValue: 1000, salvageValue: 1000 }),
      ).toBeNull();
    });
  });

  describe('elapsed months, like the backend', () => {
    it('counts the last day of the month as a full month', () => {
      const input = {
        purchaseValue: 1200,
        usefulLifeMonths: 1,
        acquisitionDate: '2025-01-31',
      };

      expect(previewDepreciation({ ...input, today: '2025-02-28' })).toEqual({
        monthlyDepreciation: 0,
        lifeEnded: true,
      });
      expect(previewDepreciation({ ...input, today: '2025-02-27' })).toEqual({
        monthlyDepreciation: 1200,
        lifeEnded: false,
      });
    });

    it('needs the day of the month to be reached', () => {
      const input = {
        purchaseValue: 1200,
        usefulLifeMonths: 12,
        acquisitionDate: '2025-06-20',
      };

      expect(
        previewDepreciation({ ...input, today: '2026-06-19' })?.lifeEnded,
      ).toBe(false);
      expect(
        previewDepreciation({ ...input, today: '2026-06-20' })?.lifeEnded,
      ).toBe(true);
    });

    it('works across a year boundary', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          usefulLifeMonths: 3,
          acquisitionDate: '2025-11-10',
          today: '2026-02-10',
        })?.lifeEnded,
      ).toBe(true);
    });

    it('does not end a future acquisition', () => {
      expect(
        previewDepreciation({
          purchaseValue: 1200,
          usefulLifeMonths: 1,
          acquisitionDate: '2027-01-01',
          today: TODAY,
        })?.lifeEnded,
      ).toBe(false);
    });
  });

  describe('incomplete or invalid date', () => {
    it.each([null, undefined, '', '2025', '2025-13-01', '2025-02-30'])(
      'skips the end-of-life check for %p',
      acquisitionDate => {
        expect(
          previewDepreciation({
            purchaseValue: 1200,
            usefulLifeYears: 1,
            acquisitionDate,
            today: TODAY,
          }),
        ).toEqual({ monthlyDepreciation: 100, lifeEnded: false });
      },
    );
  });

  describe('cannot be calculated', () => {
    it.each([null, 0, -10, NaN, Infinity])(
      'for the value %p',
      purchaseValue => {
        expect(previewDepreciation({ purchaseValue })).toBeNull();
      },
    );

    it.each([0, -1, 0.04])('for the useful life %p years', usefulLifeYears => {
      expect(
        previewDepreciation({ purchaseValue: 1000, usefulLifeYears }),
      ).toBeNull();
    });
  });
});
