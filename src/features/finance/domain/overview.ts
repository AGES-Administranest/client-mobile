import { formatCurrency } from 'shared/utils/currency';

const MINUS = '–';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasCents(value: number): boolean {
  return Math.round(Math.abs(value) * 100) % 100 !== 0;
}

export function formatOverviewAmount(value: number, locale: string): string {
  const rounded = roundMoney(value);
  const formatted = formatCurrency(Math.abs(rounded), locale, {
    showCents: rounded === 0 || hasCents(rounded),
  });
  return rounded < 0 ? `${MINUS}${formatted}` : formatted;
}
