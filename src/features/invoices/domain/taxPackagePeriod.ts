/**
 * "Download everything" has no period picker, but the API asks for one: it
 * packs from this day up to today. Nothing is issued before it.
 */
export const TAX_PACKAGE_FIRST_DAY = '2000-01-01';

export type TaxPackagePeriod = { from: string; to: string };

const pad = (value: number) => String(value).padStart(2, '0');

/** Up to the user's today, not UTC's: at 10 pm in Brazil UTC is already tomorrow. */
export function allTimeTaxPackagePeriod(
  now: Date = new Date(),
): TaxPackagePeriod {
  return {
    from: TAX_PACKAGE_FIRST_DAY,
    to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  };
}
