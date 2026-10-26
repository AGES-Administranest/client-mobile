export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Digits and the decimal separators, for fields that take a plain number. */
export function decimalOnly(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

export function formatDateInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(part => part.length > 0).join('/');
}

export function parseDateInput(value: string): Date | null {
  const digits = digitsOnly(value);
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const parsed = new Date(year, month - 1, day);

  const isRealDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;
  return isRealDate ? parsed : null;
}

export function formatCurrencyInput(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 0) return '';
  const cents = parseInt(digits, 10);
  const reais = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, '0');
  const reaisWithThousands = reais
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisWithThousands},${remainder}`;
}

export function currencyToNumber(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
}
