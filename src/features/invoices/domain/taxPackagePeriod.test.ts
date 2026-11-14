import {
  allTimeTaxPackagePeriod,
  TAX_PACKAGE_FIRST_DAY,
} from './taxPackagePeriod';

describe('allTimeTaxPackagePeriod', () => {
  it('runs from the first day up to today', () => {
    expect(allTimeTaxPackagePeriod(new Date(2026, 10, 13, 9, 30))).toEqual({
      from: TAX_PACKAGE_FIRST_DAY,
      to: '2026-11-13',
    });
  });

  it('pads the month and the day', () => {
    expect(allTimeTaxPackagePeriod(new Date(2026, 2, 5)).to).toBe('2026-03-05');
  });

  it("uses the device's calendar day, even late at night", () => {
    expect(allTimeTaxPackagePeriod(new Date(2026, 11, 31, 23, 59)).to).toBe(
      '2026-12-31',
    );
  });
});
