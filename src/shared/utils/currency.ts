const CURRENCY = 'BRL';

export function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: CURRENCY,
  });
}
