const CURRENCY = 'BRL';

type FormatCurrencyOptions = {
  showCents?: boolean;
};

export function formatCurrency(
  value: number,
  locale: string,
  { showCents = true }: FormatCurrencyOptions = {},
): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: CURRENCY,
    ...(showCents ? {} : { maximumFractionDigits: 0 }),
  });
}
